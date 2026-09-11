import { Zip, ZipPassThrough } from "fflate";
import pLimit from "p-limit";
import { creativeApi } from "@/lib/creativeApi";

// Loaded only when downloading. Images are already compressed: store them as-is.
export async function downloadGeneratedImages(items, onProgress, isCurrent) {
  const chunks = [];
  const failures = [];
  let completed = 0;
  let archiveError;
  const archive = new Zip((error, data) => {
    if (error) archiveError = error;
    else chunks.push(new Blob([data]));
  });
  const limit = pLimit(4);
  await Promise.all(items.map((item) => limit(async () => {
    if (!isCurrent()) return;
    try {
      const blob = await creativeApi.downloadGenerated(item.id);
      const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[blob.type] || "png";
      const ratio = item.briefMeta?.aspect_ratio?.replace(":", "x") || "original";
      const data = new Uint8Array(await blob.arrayBuffer());
      const file = new ZipPassThrough(`${item.id}-${ratio}.${extension}`);
      archive.add(file);
      file.push(data, true);
    } catch (error) {
      failures.push({ id: item.id, error: error.message });
    }
    onProgress(++completed);
  })));
  archive.end();
  if (archiveError) throw archiveError;
  if (isCurrent() && failures.length < items.length) {
    const url = URL.createObjectURL(new Blob(chunks, { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `generated-ads-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return failures;
}
