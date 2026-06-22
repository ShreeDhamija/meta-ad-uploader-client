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
  runInsights: (productId) => request("/insights/run", { method: "POST", body: { productId } }),
  getInsights: (productId) => request(`/insights?productId=${encodeURIComponent(productId)}`),
  getInsightAd: (productId, adId) => request(`/insights/ad?productId=${encodeURIComponent(productId)}&adId=${encodeURIComponent(adId)}`),
  runBackfill: (clientId, kind) => request("/backfills/run", { method: "POST", body: { clientId, kind } }),
  runResearch: (productId) => request("/research/run", { method: "POST", body: { productId } }),
  getResearch: (productId) => request(`/research?productId=${encodeURIComponent(productId)}`),
  runLibrary: (productId) => request("/library/run", { method: "POST", body: { productId } }),
  getLibrary: (productId) => request(`/library?productId=${encodeURIComponent(productId)}`),
  runGenerate: (body) => request("/generate/run", { method: "POST", body }),
  getGenerated: (productId) => request(`/generate?productId=${encodeURIComponent(productId)}`),
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
  generateBrief: (ideaId, productId) =>
    request(`/weekly/ideas/${encodeURIComponent(ideaId)}/brief`, { method: "POST", body: { productId } }),
  getJob: (id) => request(`/jobs/${id}`),
};

export { CREATIVE_API_URL };
