// CSV → ad variants import.
//
// Parses a campaign/ad-set/copy CSV and turns each row into a "variant" snapshot
// (the same shape Home.jsx captures for its variant tabs). Campaign and ad-set
// NAMES from the CSV are fuzzy-matched to the real IDs in the selected ad
// account; primary text / headline / links come straight from the row; Facebook
// page, Instagram, CTA, UTMs and everything else are inherited from the current
// form state (the base snapshot). Optionally, a Google Drive file link found in
// any cell is fetched and auto-assigned to that row's variant.
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
  for (const candidate of candidates) {
    const want = normalizeName(candidate);
    const key = keys.find((k) => normalizeName(k) === want);
    if (key != null && row[key] != null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
}

export function extractRowFields(row) {
  return {
    campaignName: readField(row, ["Campaign Name", "Campaign"]),
    adSetName: readField(row, ["Ad Set Name", "Ad Set", "Adset Name", "Adset"]),
    adName: readField(row, ["Ad Name", "Ad"]),
    primaryText: readField(row, ["Primary Text", "Primary", "Body", "Message"]),
    headline: readField(row, ["Headline", "Title"]),
    websiteUrl: readField(row, ["Website URL", "Website", "URL", "Link"]),
    displayLink: readField(row, ["Display Link", "Display URL", "Display"]),
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
  return () => {
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) {
        used.add(letter);
        return letter;
      }
    }
    return String(Date.now()).slice(-4);
  };
}

// ctx: {
//   campaigns, selectedAdAccount, apiBaseUrl,
//   captureCurrentSnapshot, cloneSnapshotValue, makeId,
//   existingVariants, activeVariantId,
//   setVariants, setFileVariantMap, setDriveFiles, toast,
// }
export async function importVariantsFromCsv(file, ctx) {
  const {
    campaigns,
    selectedAdAccount,
    apiBaseUrl,
    captureCurrentSnapshot,
    cloneSnapshotValue,
    makeId,
    existingVariants,
    activeVariantId,
    setVariants,
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
  } catch (err) {
    console.error("CSV parse error:", err);
    toast.error("Could not parse CSV file");
    return;
  }

  const rows = (parsed.data || [])
    .map((raw) => ({ fields: extractRowFields(raw), driveFileId: findDriveFileIdInRow(raw) }))
    .filter(
      ({ fields }) =>
        fields.primaryText || fields.headline || fields.campaignName || fields.adSetName
    );

  if (rows.length === 0) {
    toast.error("No usable rows found in CSV");
    return;
  }

  const baseSnapshot = captureCurrentSnapshot();

  // Resolve each unique campaign name once, and fetch its ad sets once, so ad-set
  // names can be matched within the right campaign (names repeat across campaigns).
  const uniqueCampaignNames = [...new Set(rows.map((r) => r.fields.campaignName).filter(Boolean))];
  const campaignByCsvName = {};
  const adSetsByCampaignId = {};

  await Promise.all(
    uniqueCampaignNames.map(async (csvName) => {
      const match = findClosestMatch(csvName, campaigns);
      if (!match) return;
      campaignByCsvName[csvName] = match.item;
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
      } catch (err) {
        console.error(`Failed to fetch ad sets for ${match.item.name}:`, err);
        adSetsByCampaignId[match.item.id] = [];
      }
    })
  );

  // Resolve a Google token only if at least one row carries a Drive link.
  const googleToken = rows.some((r) => r.driveFileId)
    ? await fetchGoogleAccessToken(apiBaseUrl)
    : null;

  const warnings = [];
  const nextLetter = makeLetterAllocator(existingVariants);

  const newVariants = [];
  const newDriveFiles = [];
  const fileVariantAssignments = {};

  for (let idx = 0; idx < rows.length; idx++) {
    const { fields, driveFileId } = rows[idx];
    const rowNum = idx + 1;
    const snap = cloneSnapshotValue(baseSnapshot);

    snap.messages = [fields.primaryText || ""];
    snap.headlines = [fields.headline || ""];
    if (fields.websiteUrl) snap.link = [fields.websiteUrl];
    if (fields.displayLink) {
      snap.customLink = fields.displayLink;
      snap.showCustomLink = true;
    }

    const campaign = fields.campaignName ? campaignByCsvName[fields.campaignName] : null;
    if (campaign) {
      snap.selectedCampaign = [campaign.id];
      const campaignAdSets = adSetsByCampaignId[campaign.id] || [];
      snap.adSets = campaignAdSets;
      const adsetMatch = fields.adSetName ? findClosestMatch(fields.adSetName, campaignAdSets) : null;
      if (adsetMatch) {
        snap.selectedAdSets = [adsetMatch.item.id];
      } else {
        snap.selectedAdSets = [];
        if (fields.adSetName) {
          warnings.push(`Row ${rowNum}: ad set "${fields.adSetName}" not found in "${campaign.name}"`);
        }
      }
    } else {
      snap.selectedCampaign = [];
      snap.selectedAdSets = [];
      snap.adSets = [];
      warnings.push(
        fields.campaignName
          ? `Row ${rowNum}: campaign "${fields.campaignName}" not found`
          : `Row ${rowNum}: no campaign specified`
      );
    }

    const variantId = makeId();

    if (driveFileId) {
      if (!googleToken) {
        warnings.push(`Row ${rowNum}: Google Drive not connected — file skipped`);
      } else {
        try {
          const driveFile = await fetchDriveFileMeta(driveFileId, googleToken);
          newDriveFiles.push(driveFile);
          fileVariantAssignments[driveFile.id] = variantId;
        } catch (err) {
          console.error(`Row ${rowNum} Drive fetch failed:`, err);
          warnings.push(`Row ${rowNum}: couldn't fetch Drive file (check sharing/permissions)`);
        }
      }
    }

    newVariants.push({ id: variantId, name: `Variant ${nextLetter()}`, snapshot: snap });
  }

  // Preserve the currently-active variant's live edits, then append the new ones.
  const currentSnapshot = captureCurrentSnapshot();
  setVariants((prev) => [
    ...prev.map((v) => (v.id === activeVariantId ? { ...v, snapshot: currentSnapshot } : v)),
    ...newVariants,
  ]);

  if (newDriveFiles.length > 0) {
    setDriveFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      return [...prev, ...newDriveFiles.filter((f) => !existingIds.has(f.id))];
    });
    setFileVariantMap((prev) => ({ ...prev, ...fileVariantAssignments }));
  }

  const matchedAdSets = newVariants.filter((v) => (v.snapshot.selectedAdSets || []).length > 0).length;
  const driveCount = newDriveFiles.length;
  toast.success(
    `Imported ${newVariants.length} variant${newVariants.length !== 1 ? "s" : ""}` +
      ` · ${matchedAdSets} ad set${matchedAdSets !== 1 ? "s" : ""} matched` +
      (driveCount > 0 ? ` · ${driveCount} Drive file${driveCount !== 1 ? "s" : ""} attached` : "")
  );

  if (warnings.length > 0) {
    console.warn("CSV import warnings:\n" + warnings.join("\n"));
    toast.error(
      `${warnings.length} item${warnings.length !== 1 ? "s" : ""} need attention — see console for details`,
      { duration: 7000 }
    );
  }

  return { created: newVariants.length, warnings };
}
