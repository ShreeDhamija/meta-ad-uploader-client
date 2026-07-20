// CSV → ad variants import.
//
// Parses a campaign/ad-set/copy CSV and turns each row into a "variant" snapshot
// (the same shape Home.jsx captures for its variant tabs). Campaign and ad-set
// NAMES from the CSV are fuzzy-matched to the real IDs in the selected ad
// account; copy, links and optional Facebook Page overrides come from the row;
// Instagram, CTA, UTMs and everything else are inherited from the current form
// state (the base snapshot). Optionally, a Google Drive file link found in any
// cell is fetched and auto-assigned to that row's variant.
//
// Everything here is framework-agnostic: the orchestrator receives the React
// state + setters it needs via `ctx`, so Home.jsx stays a thin wrapper.

import Papa from "papaparse";

// --- name normalisation + fuzzy matching ------------------------------------

export function normalizeName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, " ") // collapse all whitespace (\s covers non-breaking space)
    .replace(/[“”"']/g, "") // strip quotes
    .replace(/[_–—]/g, "-") // normalise underscores / en/em dashes to hyphen
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost);
      prevDiag = temp;
    }
  }
  return prev[b.length];
}

// Header matching is a little more forgiving than campaign/ad-set value
// matching. It ignores punctuation, spacing, case and simple plurals, then
// allows one small typo when the result is unambiguous.
function normalizeHeader(value = "") {
  return normalizeName(value)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word))
    .join(" ");
}

function findHeaderKey(keys, candidates) {
  const normalizedKeys = keys.map((key) => ({ key, normalized: normalizeHeader(key) }));

  for (const candidate of candidates) {
    const wanted = normalizeHeader(candidate);
    const exact = normalizedKeys.find(({ normalized }) => normalized === wanted);
    if (exact) return exact.key;
  }

  const fuzzyMatches = [];
  for (const candidate of candidates) {
    const wanted = normalizeHeader(candidate);
    if (wanted.length < 4) continue;
    for (const entry of normalizedKeys) {
      const tolerance = Math.max(1, Math.floor(wanted.length * 0.15));
      const distance = levenshtein(wanted, entry.normalized);
      if (distance <= tolerance) fuzzyMatches.push({ ...entry, distance });
    }
  }

  fuzzyMatches.sort((a, b) => a.distance - b.distance);
  if (fuzzyMatches.length === 0) return null;
  if (fuzzyMatches.length > 1 && fuzzyMatches[0].distance === fuzzyMatches[1].distance && fuzzyMatches[0].key !== fuzzyMatches[1].key) {
    return null;
  }
  return fuzzyMatches[0].key;
}

function findExactHeaderKey(keys, candidates) {
  const normalizedCandidates = new Set(candidates.map(normalizeHeader));
  return keys.find((key) => normalizedCandidates.has(normalizeHeader(key))) || null;
}

// Find the closest item whose name matches `target`. Tries, in order: exact
// normalised equality, unique containment either direction, then smallest edit
// distance within a length-relative tolerance. Returns { item, exact } or null.
export function findClosestMatch(target, items, getName = (x) => x.name) {
  const wanted = normalizeName(target);
  if (!wanted || !Array.isArray(items) || items.length === 0) return null;

  for (const item of items) {
    if (normalizeName(getName(item)) === wanted) return { item, exact: true };
  }

  const contains = items.filter((item) => {
    const name = normalizeName(getName(item));
    return name && (name.includes(wanted) || wanted.includes(name));
  });
  if (contains.length === 1) return { item: contains[0], exact: false };

  let best = null;
  let bestDist = Infinity;
  for (const item of items) {
    const dist = levenshtein(wanted, normalizeName(getName(item)));
    if (dist < bestDist) {
      bestDist = dist;
      best = item;
    }
  }
  if (best) {
    const tolerance = Math.max(2, Math.floor(wanted.length * 0.25));
    if (bestDist <= tolerance) return { item: best, exact: false };
  }
  return null;
}

// --- CSV row extraction ------------------------------------------------------

// Read a field from a parsed row, tolerant of header spelling/spacing/case.
function readField(row, candidates) {
  const keys = Object.keys(row);
  const key = findHeaderKey(keys, candidates);
  if (key != null && row[key] != null && String(row[key]).trim() !== "") {
    return String(row[key]).trim();
  }
  return "";
}

function readNumberedFields(row, candidates, maxFields = 5) {
  const keys = Object.keys(row);
  const values = [];

  for (let index = 1; index <= maxFields; index++) {
    const numberedCandidates = candidates.flatMap((candidate) => [
      `${candidate} ${index}`,
      `${candidate} #${index}`,
    ]);

    const key = findExactHeaderKey(keys, numberedCandidates)
      || (index === 1 ? findExactHeaderKey(keys, candidates) : null);
    if (key != null && row[key] != null && String(row[key]).trim() !== "") {
      values.push(String(row[key]).trim());
    }
  }

  return values;
}

const CSV_COLUMNS = {
  campaignName: ["Campaign Name", "Campaign"],
  adSetName: ["Ad Set Name", "Ad Set", "Ad Sets", "Adset Name", "Adset"],
  adName: ["Ad Name", "Ad"],
  primaryText: ["Primary Text", "Primary", "Body", "Message"],
  headline: ["Headline", "Title"],
  description: ["Description", "Descriptions"],
  facebookPage: ["Facebook Page", "Facebook Page Name", "Page Name", "Page"],
  websiteUrl: ["Website URL", "Website", "Destination URL", "URL"],
};

export function extractRowFields(row) {
  const primaryTexts = readNumberedFields(row, CSV_COLUMNS.primaryText);
  const headlines = readNumberedFields(row, CSV_COLUMNS.headline);
  const descriptions = readNumberedFields(row, CSV_COLUMNS.description);

  return {
    campaignName: readField(row, CSV_COLUMNS.campaignName),
    adSetName: readField(row, CSV_COLUMNS.adSetName),
    adName: readField(row, CSV_COLUMNS.adName),
    primaryTexts,
    headlines,
    descriptions,
    facebookPage: readField(row, CSV_COLUMNS.facebookPage),
    // The ad's destination. (The CSV's "Display Link" is an ad-account-level
    // setting, not a per-variant field, so it isn't imported here.)
    websiteUrl: readField(row, CSV_COLUMNS.websiteUrl),
  };
}

// --- Google Drive link handling ---------------------------------------------

function extractDriveFileId(text) {
  if (!text) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Scan every cell for a Google Drive/Docs URL and return the first file id found.
// (Column-name agnostic — the link may sit inside a cell with other text.)
function findDriveFileIdInRow(row) {
  for (const value of Object.values(row)) {
    if (typeof value !== "string") continue;
    if (!/https?:\/\/(?:drive|docs)\.google\.com/i.test(value)) continue;
    const urlMatch = value.match(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s",]+/i);
    const id = extractDriveFileId(urlMatch ? urlMatch[0] : value);
    if (id) return id;
  }
  return null;
}

async function fetchGoogleAccessToken(apiBaseUrl) {
  try {
    const res = await fetch(`${apiBaseUrl}/auth/google/status`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.authenticated ? data.accessToken || null : null;
  } catch {
    return null;
  }
}

// Build a driveFile object shaped exactly like the Drive Picker produces, so all
// downstream code (which spreads `{ ...file, isDrive: true }`) works unchanged.
async function fetchDriveFileMeta(fileId, token) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}` +
      `?fields=id,name,mimeType,size,thumbnailLink&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive fetch failed (${res.status})`);
  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: parseInt(data.size || "0", 10),
    accessToken: token,
    pickerThumbnail: data.thumbnailLink || null,
  };
}

// --- orchestrator ------------------------------------------------------------

function makeLetterAllocator(existingVariants) {
  const used = new Set(
    (existingVariants || [])
      .filter((v) => v.id !== "default")
      .map((v) => (v.name || "").replace(/^(Form|Variant)\s+/, ""))
  );
  let index = 0;

  // Excel-style sequence: A…Z, AA…AZ, BA…, so large CSVs retain short,
  // stable and unique labels instead of falling back to timestamps.
  const getLetterSequence = (value) => {
    let result = "";
    let current = value;
    do {
      result = String.fromCharCode(65 + (current % 26)) + result;
      current = Math.floor(current / 26) - 1;
    } while (current >= 0);
    return result;
  };

  return () => {
    while (true) {
      const letter = getLetterSequence(index);
      index += 1;
      if (!used.has(letter)) {
        used.add(letter);
        return letter;
      }
    }
  };
}

// ctx: {
//   campaigns, pages, selectedAdAccount, apiBaseUrl,
//   captureCurrentSnapshot, cloneSnapshotValue, hydrateFromSnapshot, makeId,
//   existingVariants,
//   setVariants, setActiveVariantId, setFileVariantMap, setDriveFiles, toast,
// }
export async function importVariantsFromCsv(file, ctx) {
  const {
    campaigns,
    pages,
    selectedAdAccount,
    apiBaseUrl,
    captureCurrentSnapshot,
    cloneSnapshotValue,
    hydrateFromSnapshot,
    makeId,
    existingVariants,
    setVariants,
    setActiveVariantId,
    setFileVariantMap,
    setDriveFiles,
    toast,
  } = ctx;

  if (!file) return;
  if (!selectedAdAccount) {
    toast.error("Select an ad account before importing a CSV");
    return;
  }
  if (!Array.isArray(campaigns) || campaigns.length === 0) {
    toast.error("Campaigns are still loading — try again in a moment");
    return;
  }

  let parsed;
  try {
    parsed = await new Promise((resolve, reject) => {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
    });
  } catch {
    toast.error("Could not parse CSV file");
    return;
  }

  const rows = (parsed.data || [])
    .map((raw) => ({ fields: extractRowFields(raw), driveFileId: findDriveFileIdInRow(raw) }))
    .filter(
      ({ fields, driveFileId }) =>
        fields.primaryTexts.length > 0 ||
        fields.headlines.length > 0 ||
        fields.descriptions.length > 0 ||
        fields.campaignName ||
        fields.adSetName ||
        fields.adName ||
        fields.facebookPage ||
        fields.websiteUrl ||
        driveFileId
    );

  if (rows.length === 0) {
    toast.error("No usable rows found in CSV");
    return;
  }

  const baseSnapshot = captureCurrentSnapshot();

  // Resolve each unique campaign name once, and fetch its ad sets once, so ad-set
  // names can be matched within the right campaign (names repeat across campaigns).
  const uniqueCampaignNames = [
    ...new Map(
      rows
        .map((r) => r.fields.campaignName)
        .filter(Boolean)
        .map((name) => [normalizeName(name), name])
    ).values(),
  ];
  const campaignByCsvName = {};
  const adSetsByCampaignId = {};
  const warnings = [];
  const warningColumns = new Set();
  const addWarning = (columnName, message) => {
    warningColumns.add(columnName);
    warnings.push(message);
  };

  await Promise.all(
    uniqueCampaignNames.map(async (csvName) => {
      const match = findClosestMatch(csvName, campaigns);
      if (!match) return;
      campaignByCsvName[normalizeName(csvName)] = match.item;
      if (match.item.id in adSetsByCampaignId) return;
      try {
        const res = await fetch(`${apiBaseUrl}/auth/fetch-adsets?campaignId=${match.item.id}`, {
          credentials: "include",
        });
        const data = await res.json();
        adSetsByCampaignId[match.item.id] = (data.adSets || []).map((a) => ({
          ...a,
          campaignId: match.item.id,
          campaignName: match.item.name,
        }));
      } catch {
        adSetsByCampaignId[match.item.id] = [];
      }
    })
  );

  // Resolve a Google token only if at least one row carries a Drive link.
  const googleToken = rows.some((r) => r.driveFileId)
    ? await fetchGoogleAccessToken(apiBaseUrl)
    : null;

  const nextLetter = makeLetterAllocator(existingVariants);

  const newVariants = [];      // variants for rows 1..N (row 0 → Default)
  const newDriveFiles = [];
  const fileVariantAssignments = {};
  let defaultSnapshot = null;  // row 0 populates the existing Default variant

  for (let idx = 0; idx < rows.length; idx++) {
    const { fields, driveFileId } = rows[idx];
    const rowNum = idx + 1;
    const snap = cloneSnapshotValue(baseSnapshot);

    if (fields.primaryTexts.length > 0) snap.messages = fields.primaryTexts;
    if (fields.headlines.length > 0) snap.headlines = fields.headlines;
    if (fields.descriptions.length > 0) snap.descriptions = fields.descriptions;
    if (fields.adName) {
      snap.adName = fields.adName;
      // The launch path derives names from this formula. A literal CSV value
      // must replace the saved formula as well as the current preview value.
      snap.adNameFormulaV2 = { rawInput: fields.adName };
    }
    if (fields.facebookPage) {
      const pageMatch = (pages || []).find((page) => String(page.id) === fields.facebookPage)
        || findClosestMatch(fields.facebookPage, pages || []);
      const matchedPage = pageMatch?.item || pageMatch;
      if (matchedPage) {
        snap.pageId = matchedPage.id;
        snap.instagramAccountId = matchedPage.instagramAccount?.id || "";
      } else {
        snap.pageId = "";
        snap.instagramAccountId = "";
        addWarning("Facebook Page", `Row ${rowNum}: Facebook Page "${fields.facebookPage}" not found`);
      }
    }
    if (fields.websiteUrl) {
      // Drive the website through the custom-link path so the exact CSV URL is
      // used (an arbitrary CSV URL won't necessarily be one of the account's
      // saved links). link[0] and customLink are kept in sync, as the form does.
      snap.link = [fields.websiteUrl];
      snap.customLink = fields.websiteUrl;
      snap.showCustomLink = true;
    }

    if (fields.campaignName) {
      const campaign = campaignByCsvName[normalizeName(fields.campaignName)];
      if (campaign) {
        const baseAlreadyUsesCampaign = (baseSnapshot.selectedCampaign || []).includes(campaign.id);
        const campaignAdSets = adSetsByCampaignId[campaign.id] || [];
        snap.selectedCampaign = [campaign.id];
        snap.adSets = campaignAdSets;

        if (fields.adSetName) {
          const adsetMatch = findClosestMatch(fields.adSetName, campaignAdSets);
          if (adsetMatch) {
            snap.selectedAdSets = [adsetMatch.item.id];
          } else {
            snap.selectedAdSets = [];
            addWarning("Ad Set Name", `Row ${rowNum}: ad set "${fields.adSetName}" not found in "${campaign.name}"`);
          }
        } else if (baseAlreadyUsesCampaign) {
          const validAdSetIds = new Set(campaignAdSets.map((adSet) => adSet.id));
          snap.selectedAdSets = (baseSnapshot.selectedAdSets || []).filter((id) => validAdSetIds.has(id));
        } else {
          snap.selectedAdSets = [];
        }
      } else {
        snap.selectedCampaign = [];
        snap.selectedAdSets = [];
        snap.adSets = [];
        addWarning("Campaign Name", `Row ${rowNum}: campaign "${fields.campaignName}" not found`);
      }
    } else if (fields.adSetName) {
      // With no campaign in the row, match against the campaign/ad-set context
      // already selected in the form and keep that campaign unchanged.
      const adsetMatch = findClosestMatch(fields.adSetName, snap.adSets || []);
      if (adsetMatch) {
        snap.selectedAdSets = [adsetMatch.item.id];
      } else {
        snap.selectedAdSets = [];
        addWarning("Ad Set Name", `Row ${rowNum}: ad set "${fields.adSetName}" not found in the selected campaign`);
      }
    }

    // Row 0 populates the existing Default variant; the rest become new variants.
    const variantId = idx === 0 ? "default" : makeId();

    if (driveFileId) {
      if (!googleToken) {
        addWarning("Google Drive Link", `Row ${rowNum}: Google Drive not connected — file skipped`);
      } else {
        try {
          const driveFile = await fetchDriveFileMeta(driveFileId, googleToken);
          newDriveFiles.push(driveFile);
          fileVariantAssignments[driveFile.id] = variantId;
        } catch {
          addWarning("Google Drive Link", `Row ${rowNum}: couldn't fetch Drive file (check sharing/permissions)`);
        }
      }
    }

    if (idx === 0) {
      defaultSnapshot = snap;
    } else {
      newVariants.push({ id: variantId, name: `Variant ${nextLetter()}`, snapshot: snap });
    }
  }

  // Row 0 → Default (the active variant): clear its stored snapshot and load it
  // into the live form. Rows 1..N are appended as new variants; any pre-existing
  // non-default variants are kept untouched.
  setVariants((prev) => [
    ...prev.map((v) => (v.id === "default" ? { ...v, snapshot: null } : v)),
    ...newVariants,
  ]);
  setActiveVariantId("default");
  if (defaultSnapshot) hydrateFromSnapshot(defaultSnapshot);

  if (newDriveFiles.length > 0) {
    setDriveFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      return [...prev, ...newDriveFiles.filter((f) => !existingIds.has(f.id))];
    });
    setFileVariantMap((prev) => ({ ...prev, ...fileVariantAssignments }));
  }

  const totalVariants = newVariants.length + (defaultSnapshot ? 1 : 0);
  const matchedAdSets =
    (defaultSnapshot && (defaultSnapshot.selectedAdSets || []).length > 0 ? 1 : 0) +
    newVariants.filter((v) => (v.snapshot.selectedAdSets || []).length > 0).length;
  const driveCount = newDriveFiles.length;
  toast.success(
    `Imported ${totalVariants} variant${totalVariants !== 1 ? "s" : ""}` +
      ` · ${matchedAdSets} ad set${matchedAdSets !== 1 ? "s" : ""} matched` +
      (driveCount > 0 ? ` · ${driveCount} Drive file${driveCount !== 1 ? "s" : ""} attached` : "")
  );

  if (warnings.length > 0) {
    toast.error(
      `Check ${Array.from(warningColumns).join(", ")} in your CSV`,
      { duration: 7000 }
    );
  }

  return { created: totalVariants, warnings };
}
