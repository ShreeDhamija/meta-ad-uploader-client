// API client for the creative-strategy service (separate Railway service from
// the main withblip API). Auth uses the shared `.withblip.com` session cookie
// in production (credentials: "include"); in local dev it sends an X-Dev-Uid
// header from VITE_DEV_UID so you can exercise it without the cross-origin cookie.

const CREATIVE_API_URL =
  import.meta.env.VITE_CREATIVE_API_URL || "http://localhost:3001";

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  // Dev-only identity stub — hardcoded to the owner's Facebook user id so the
  // worker finds the matching Meta token in Firestore. In production the shared
  // .withblip.com session cookie supplies the user instead (this header is
  // ignored when the creative API runs with NODE_ENV=production).
  if (import.meta.env.DEV) {
    headers["X-Dev-Uid"] = "10236978990363167";
  }
  const res = await fetch(`${CREATIVE_API_URL}/api${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const creativeApi = {
  me: () => request("/me"),
  listClients: () => request("/clients"),
  syncBrands: () => request("/clients/sync", { method: "POST" }),
  createClient: (body) => request("/clients", { method: "POST", body }),
  getClient: (id) => request(`/clients/${id}`),
  listProducts: (clientId) => request(`/products?clientId=${encodeURIComponent(clientId)}`),
  createProduct: (body) => request("/products", { method: "POST", body }),
  getProduct: (id) => request(`/products/${id}`),
  getContext: (productId) => request(`/context?productId=${encodeURIComponent(productId)}`),
  saveContext: (productId, intelType, contentText) => request("/context", { method: "PUT", body: { productId, intelType, contentText } }),
  runIngest: (productId) => request("/context/ingest", { method: "POST", body: { productId } }),
  getBranding: (clientId) => request(`/branding?clientId=${encodeURIComponent(clientId)}`),
  saveBranding: (body) => request("/branding", { method: "PUT", body }),
  getAssets: (productId) => request(`/products/${encodeURIComponent(productId)}/assets`),
  addAsset: (productId, body) => request(`/products/${encodeURIComponent(productId)}/assets`, { method: "POST", body }),
  uploadAsset: (productId, body) => request(`/products/${encodeURIComponent(productId)}/assets/upload`, { method: "POST", body }),
  scrapeAssets: (productId, url) => request(`/products/${encodeURIComponent(productId)}/assets/scrape`, { method: "POST", body: { url } }),
  saveScrapedAssets: (productId, images, assetType) => request(`/products/${encodeURIComponent(productId)}/assets/save-scraped`, { method: "POST", body: { images, assetType } }),
  importBrandAssets: (productId, url) => request(`/products/${encodeURIComponent(productId)}/assets/import`, { method: "POST", body: url ? { url } : {} }),
  deleteAsset: (productId, assetId) => request(`/products/${encodeURIComponent(productId)}/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" }),
  runInsights: (productId) => request("/insights/run", { method: "POST", body: { productId } }),
  getInsights: (productId) => request(`/insights?productId=${encodeURIComponent(productId)}`),
  getInsightAd: (productId, adId) => request(`/insights/ad?productId=${encodeURIComponent(productId)}&adId=${encodeURIComponent(adId)}`),
  getAngles: (productId) => request(`/insights/angles?productId=${encodeURIComponent(productId)}`),
  runTrending: (productId) => request("/insights/trending/run", { method: "POST", body: { productId } }),
  runBackfill: (clientId, kind) => request("/backfills/run", { method: "POST", body: { clientId, kind } }),
  getLearnings: (clientId) => request(`/learnings?clientId=${encodeURIComponent(clientId)}`),
  createLearning: (body) => request("/learnings", { method: "POST", body }),
  updateLearning: (id, body) => request(`/learnings/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteLearning: (id) => request(`/learnings/${encodeURIComponent(id)}`, { method: "DELETE" }),
  runResearch: (productId) => request("/research/run", { method: "POST", body: { productId } }),
  getResearch: (productId) => request(`/research?productId=${encodeURIComponent(productId)}`),
  runReddit: (productId) => request("/research/reddit/run", { method: "POST", body: { productId } }),
  expandPersona: (body) => request("/research/persona/expand", { method: "POST", body }),
  runLibrary: (productId) => request("/library/run", { method: "POST", body: { productId } }),
  getLibrary: (productId) => request(`/library?productId=${encodeURIComponent(productId)}`),
  setLibraryStatus: (id, status) => request(`/library/${encodeURIComponent(id)}/status`, { method: "POST", body: { status } }),
  runGenerate: (body) => request("/generate/run", { method: "POST", body }),
  generateCopy: (body) => request("/generate/copy", { method: "POST", body }),
  generateConceptBrief: (body) => request("/generate/brief", { method: "POST", body }),
  getGenerated: (productId) => request(`/generate?productId=${encodeURIComponent(productId)}`),
  rateGenerated: (id, rating) => request(`/generate/${encodeURIComponent(id)}/feedback`, { method: "POST", body: { rating } }),
  deleteGenerated: (id) => request(`/generate/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getFormats: () => request("/generate/formats"),
  fillCopy: (body) => request("/generate/fill-copy", { method: "POST", body }),
  uploadInspo: (body) => request("/inspo/upload", { method: "POST", body }),
  runInspo: (clientId) => request("/inspo/run", { method: "POST", body: { clientId } }),
  getInspo: (clientId, productId) =>
    request(`/inspo?clientId=${encodeURIComponent(clientId)}${productId ? `&productId=${encodeURIComponent(productId)}` : ""}`),
  runWeekly: (clientId) => request("/weekly/run", { method: "POST", body: { clientId } }),
  getWeekly: (clientId) => request(`/weekly?clientId=${encodeURIComponent(clientId)}`),
  getHeartbeat: (clientId, force) =>
    request(`/weekly/heartbeat?clientId=${encodeURIComponent(clientId)}${force ? "&force=1" : ""}`),
  approveIdea: (ideaId) => request(`/weekly/ideas/${encodeURIComponent(ideaId)}/approve`, { method: "POST" }),
  setIdeaStatus: (ideaId, status) => request(`/weekly/ideas/${encodeURIComponent(ideaId)}/status`, { method: "POST", body: { status } }),
  generateBrief: (ideaId, productId) =>
    request(`/weekly/ideas/${encodeURIComponent(ideaId)}/brief`, { method: "POST", body: { productId } }),
  getJob: (id) => request(`/jobs/${id}`),
  getUsage: ({ window = "7d", groupBy = "provider", clientId } = {}) =>
    request(`/usage?window=${encodeURIComponent(window)}&groupBy=${encodeURIComponent(groupBy)}${clientId ? `&clientId=${encodeURIComponent(clientId)}` : ""}`),
};

export { CREATIVE_API_URL };
