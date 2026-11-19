// API client for dam-service (the asset library). Modelled on creativeApi.js.
// Hosted: the shared `.withblip.com` session cookie identifies the user
// (credentials: "include"). Local dev: an X-Dev-Uid header from VITE_DEV_UID,
// which the service ignores when hosted.

const DAM_API_URL = import.meta.env.VITE_DAM_API_URL || "http://localhost:3002";

export class DamApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_UID) {
    headers["X-Dev-Uid"] = import.meta.env.VITE_DEV_UID;
  }
  const res = await fetch(`${DAM_API_URL}/api${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new DamApiError(data.error || `HTTP ${res.status}`, res.status);
  return data;
}

const q = encodeURIComponent;

export const damApi = {
  me: () => request("/me"),
  org: () => request("/org"),

  listWorkspaces: () => request("/workspaces"),
  // `accounts`: the ad accounts AppContext already holds ([{ id, name }]).
  syncWorkspaces: (accounts) => request("/workspaces/sync", { method: "POST", body: { accounts } }),
  createWorkspace: (body) => request("/workspaces", { method: "POST", body }),
  updateWorkspace: (id, body) => request(`/workspaces/${q(id)}`, { method: "PATCH", body }),
  archiveWorkspace: (id) => request(`/workspaces/${q(id)}/archive`, { method: "POST" }),
  overview: (id) => request(`/workspaces/${q(id)}/overview`),

  listFolders: (workspaceId) => request(`/folders?workspaceId=${q(workspaceId)}`),
  createFolder: (body) => request("/folders", { method: "POST", body }),
  updateFolder: (id, body) => request(`/folders/${q(id)}`, { method: "PATCH", body }),
  trashFolder: (id) => request(`/folders/${q(id)}/trash`, { method: "POST" }),
  restoreFolder: (id) => request(`/folders/${q(id)}/restore`, { method: "POST" }),
};

export const DAM_ENABLED = import.meta.env.VITE_ENABLE_DAM === "true";
export { DAM_API_URL };
