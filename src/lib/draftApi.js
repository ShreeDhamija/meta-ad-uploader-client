import axios from "axios";
import pLimit from "p-limit";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const CHUNK_SIZE = 10 * 1024 * 1024;
const PART_CONCURRENCY = 5;
const PART_RETRIES = 3;
const UPLOAD_ATTEMPTS = 2;

function isAbortError(error, signal) {
  return signal?.aborted || axios.isCancel(error) || error?.name === "AbortError";
}

function abortError() {
  return new DOMException("Draft save cancelled", "AbortError");
}

function waitWithSignal(delayMs, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      clearTimeout(timeoutId);
      reject(abortError());
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

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

export async function createDraft({ adAccountId, name, signal }) {
  const response = await fetch(`${API_BASE_URL}/api/drafts`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adAccountId, name }),
    signal,
  });
  return readJson(response);
}

export async function updateDraft({ draftId, adAccountId, name, state, signal }) {
  const response = await fetch(`${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adAccountId, name, state }),
    signal,
  });
  return readJson(response);
}

export async function discardDraftMedia({ draftId, adAccountId, mediaIds }) {
  if (!mediaIds?.length) return { success: true, deletedMediaIds: [] };
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/discard`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adAccountId, mediaIds }),
    }
  );
  return readJson(response);
}

export async function pruneDraftMedia({ draftId, adAccountId, keepMediaIds }) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/prune`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adAccountId, keepMediaIds }),
    }
  );
  return readJson(response);
}

export async function getDraft({ draftId, adAccountId }) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}?adAccountId=${encodeURIComponent(adAccountId)}`,
    { credentials: "include" }
  );
  return (await readJson(response)).draft;
}

export async function downloadDraftMedia({ draftId, adAccountId, mediaId }) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/${encodeURIComponent(mediaId)}/content?adAccountId=${encodeURIComponent(adAccountId)}`,
    { credentials: "include" }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to download draft media");
  }
  return response.blob();
}

export async function refreshDraftMediaUrl({ draftId, adAccountId, mediaId, signal }) {
  const response = await fetch(
    `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/${encodeURIComponent(mediaId)}/refresh-url`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adAccountId }),
      signal,
    }
  );
  return (await readJson(response)).url;
}

export async function cleanupPublishedDraftMedia({ draftId, adAccountId, mediaIds }) {
  let lastError;
  let result;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/cleanup-published`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adAccountId, mediaIds }),
        }
      );
      result = await readJson(response);
      if (!result.failedMediaIds?.length) return result;
      lastError = new Error(`Could not remove ${result.failedMediaIds.length} published draft file(s)`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await waitWithSignal(750 * (2 ** (attempt - 1)));
  }
  if (result) return result;
  throw lastError;
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
  onProgress,
  signal,
}) {
  const partCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  let lastError;

  for (let uploadAttempt = 1; uploadAttempt <= UPLOAD_ATTEMPTS; uploadAttempt += 1) {
    if (signal?.aborted) throw abortError();
    let started;
    try {
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
          signal,
        }
      );
      started = await readJson(startResponse);
      onProgress?.(0);

      let completedCount = 0;
      const limit = pLimit(PART_CONCURRENCY);
      const completedParts = await Promise.all(started.parts.map(({ partNumber, url }) => limit(async () => {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const chunk = file.slice(start, Math.min(file.size, start + CHUNK_SIZE));
        let uploaded;
        for (let partAttempt = 1; partAttempt <= PART_RETRIES; partAttempt += 1) {
          if (signal?.aborted) throw abortError();
          try {
            uploaded = await axios.put(url, chunk, {
              headers: { "Content-Type": file.type || "application/octet-stream" },
              signal,
            });
            break;
          } catch (error) {
            if (isAbortError(error, signal)) throw abortError();
            if (partAttempt === PART_RETRIES) throw error;
            await waitWithSignal(750 * (2 ** (partAttempt - 1)), signal);
          }
        }

        const etag = uploaded?.headers.etag;
        if (!etag) throw new Error(`Upload part ${partNumber} did not return an ETag`);
        completedCount += 1;
        onProgress?.(completedCount / partCount);
        return { PartNumber: partNumber, ETag: etag.replaceAll('"', "") };
      })));

      const completionPayload = {
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
      };

      let completionError;
      for (let completionAttempt = 1; completionAttempt <= 3; completionAttempt += 1) {
        if (signal?.aborted) throw abortError();
        try {
          const completeResponse = await fetch(
            `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/complete-upload`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(completionPayload),
              signal,
            }
          );
          const result = await readJson(completeResponse);
          onProgress?.(1);
          return result;
        } catch (error) {
          completionError = error;
          if (isAbortError(error, signal)) throw abortError();
          if (completionAttempt < 3) {
            await waitWithSignal(1000 * (2 ** (completionAttempt - 1)), signal);
          }
        }
      }
      throw completionError;
    } catch (error) {
      lastError = error;
      if (started?.uploadId && started?.key) {
        await fetch(
          `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/abort-upload`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adAccountId,
              mediaId,
              uploadId: started.uploadId,
              key: started.key,
            }),
          }
        ).catch(() => {});
      }
      if (isAbortError(error, signal)) throw abortError();
      if (uploadAttempt < UPLOAD_ATTEMPTS) {
        await waitWithSignal(1500 * uploadAttempt, signal);
      }
    }
  }

  throw new Error(`Failed to upload ${file.name}: ${lastError?.message || "unknown error"}`);
}

export async function importDraftMedia({
  draftId,
  adAccountId,
  mediaId,
  source,
  file,
  previewDataUrl,
  providerRef,
  signal,
}) {
  const body = JSON.stringify({
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
  });
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/drafts/${encodeURIComponent(draftId)}/media/import`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body,
          signal,
        }
      );
      return await readJson(response);
    } catch (error) {
      lastError = error;
      if (isAbortError(error, signal)) throw abortError();
      if (attempt < 3) {
        await waitWithSignal(1000 * (2 ** (attempt - 1)), signal);
      }
    }
  }
  throw lastError;
}

export async function getQaDraft(token) {
  const response = await fetch(`${API_BASE_URL}/api/qa/${encodeURIComponent(token)}`);
  return (await readJson(response)).draft;
}
