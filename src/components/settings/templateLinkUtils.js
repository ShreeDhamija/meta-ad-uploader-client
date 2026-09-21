// Keep saved metadata separate from the URL strings used by ad creation.
export const EMPTY_TEMPLATE_LINK_SYNC = { enabled: false, pairs: [] };
const compareNames = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

export function sortTemplates(templates, mode = "default", defaultName = "") {
  const entries = Object.entries(templates || {});
  if (mode === "alphabetical") return entries.sort(([a], [b]) => compareNames(a, b));
  if (mode === "oldest") entries.reverse();
  return entries.sort(([a, aData], [b, bData]) => {
    if (a === defaultName) return -1;
    if (b === defaultName) return 1;
    return mode === "most_used" ? (bData?.usageCount || 0) - (aData?.usageCount || 0) : 0;
  });
}

export function sortLinks(links, mode = "created") {
  // Legacy links have no timestamp; their saved array order is their creation order.
  const entries = [...(links || [])];
  if (mode === "alphabetical") return entries.sort((a, b) => compareNames(a.title?.trim() || a.url, b.title?.trim() || b.url) || compareNames(a.url, b.url));
  const createdTime = link => {
    const raw = link.createdAt;
    if (typeof raw === "number") return raw;
    if (raw?.seconds || raw?._seconds) return (raw.seconds || raw._seconds) * 1000;
    return Date.parse(raw) || 0;
  };
  entries.sort((a, b) => createdTime(a) - createdTime(b));
  return mode === "newest" ? entries.reverse() : entries;
}

export function validTemplateLinkPairs(sync, templates, links) {
  const seen = new Set();
  const urls = new Set((links || []).map(link => link.url));
  return (Array.isArray(sync?.pairs) ? sync.pairs : []).filter(pair => {
    if (!pair || !Object.prototype.hasOwnProperty.call(templates || {}, pair.templateName) || !urls.has(pair.url) || seen.has(pair.templateName)) return false;
    seen.add(pair.templateName);
    return true;
  });
}

export function templateForLink(pairs, url, currentTemplate) {
  const matches = pairs.filter(pair => pair.url === url).map(pair => pair.templateName);
  return matches.includes(currentTemplate) ? currentTemplate : matches.sort(compareNames)[0];
}
