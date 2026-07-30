import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const CHUNK_SIZE = 10 * 1024 * 1024;

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Draft request failed");
  }
  return data;
}

export async function listDrafts(adAccountId) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts?adAccountId=${encodeURIComponent(adAccountId)}`,
    { credentials: "include" }
  );
  return (await readJson(response)).drafts || [];
}

export async function createDraft({ adAccountId, name }) {
  const response = await fetch(`${API_BASE_URL}/api/drafts`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adAccountId, name }),
  });
  return readJson(response);
}

export async function updateDraft({ draftId, adAccountId, name, state }) {
  const response = await fetch(`${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adAccountId, name, state }),
  });
  return readJson(response);
}

export async function getDraft({ draftId, adAccountId }) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}?adAccountId=${encodeURIComponent(adAccountId)}`,
    { credentials: "include" }
  );
  return (await readJson(response)).draft;
}

export async function deleteDraft({ draftId, adAccountId }) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}?adAccountId=${encodeURIComponent(adAccountId)}`,
    { method: "DELETE", credentials: "include" }
  );
  return readJson(response);
}

export async function createDraftShareUrl({ draftId, adAccountId }) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/share`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adAccountId }),
    }
  );
  return (await readJson(response)).url;
}

export async function uploadLocalDraftMedia({
  draftId,
  adAccountId,
  mediaId,
  file,
  previewDataUrl,
  width,
  height,
}) {
  const partCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const startResponse = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/start-upload`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adAccountId,
        mediaId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        partCount,
      }),
    }
  );
  const started = await readJson(startResponse);

  const completedParts = await Promise.all(started.parts.map(async ({ partNumber, url }) => {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const chunk = file.slice(start, Math.min(file.size, start + CHUNK_SIZE));
    const uploaded = await axios.put(url, chunk, {
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    const etag = uploaded.headers.etag;
    if (!etag) throw new Error(`Upload part ${partNumber} did not return an ETag`);
    return { PartNumber: partNumber, ETag: etag.replaceAll('"', "") };
  }));

  const completeResponse = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/complete-upload`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adAccountId,
        mediaId,
        uploadId: started.uploadId,
        key: started.key,
        parts: completedParts,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        source: "local",
        previewDataUrl: previewDataUrl || null,
        width: width || null,
        height: height || null,
      }),
    }
  );
  return readJson(completeResponse);
}

export async function importDraftMedia({
  draftId,
  adAccountId,
  mediaId,
  source,
  file,
  previewDataUrl,
  providerRef,
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/import`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adAccountId,
        mediaId,
        source,
        name: file.name,
        mimeType: file.mimeType || file.type || "application/octet-stream",
        fileId: source === "drive"
          ? file.id
          : source === "dropbox"
            ? file.dropboxId
            : source === "frameio"
              ? file.frameioId
              : null,
        accountId: file.frameioAccountId || null,
        sourceUrl: file.s3Url || file.source || file.url || file.thumbnail_url || null,
        previewSourceUrl: file.previewUrl || file.thumbnail_url || file.url || null,
        previewDataUrl: previewDataUrl || null,
        width: file.width || null,
        height: file.height || null,
        providerRef: providerRef || null,
      }),
    }
  );
  return readJson(response);
}

export async function getQaDraft(token) {
  const response = await fetch(`${API_BASE_URL}/api/qa/${encodeURIComponent(token)}`);
  return (await readJson(response)).draft;
}
