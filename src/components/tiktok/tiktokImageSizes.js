// TikTok image ad sizes. Images at any other size can't be delivered to the TikTok placement.
// 720x1152 is left out on purpose: TikTok only accepts it in search ad campaigns.
export const TIKTOK_IMAGE_SIZES = [
  { width: 1200, height: 628 },
  { width: 640, height: 640 },
  { width: 720, height: 1280 },
];

const SIZES_LABEL = TIKTOK_IMAGE_SIZES.map((s) => `${s.width}×${s.height}`).join(", ");

export const isTikTokImageFile = (file) =>
  Boolean(
    file?.type?.startsWith?.("image/") ||
      file?.mimeType?.startsWith?.("image/") ||
      /\.(png|jpe?g)$/i.test(file?.name || ""),
  );

export const isSupportedTikTokImageSize = ({ width, height }) =>
  TIKTOK_IMAGE_SIZES.some((s) => s.width === width && s.height === height);

export const tiktokImageSizeError = (name, { width, height }) =>
  `"${name}" is ${width}×${height}. TikTok image ads must be ${SIZES_LABEL}.`;

// Reads an image's pixel size from a File/Blob or a URL. Resolves null when it can't be read.
export const readImageSize = (source) =>
  new Promise((resolve) => {
    const isBlob = typeof Blob !== "undefined" && source instanceof Blob;
    const url = isBlob ? URL.createObjectURL(source) : source;
    if (!url) return resolve(null);
    const img = new Image();
    const done = (size) => {
      if (isBlob) URL.revokeObjectURL(url);
      resolve(size);
    };
    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done(null);
    img.src = url;
  });

// Pixel size of a Google Drive image from its metadata (no download). Resolves null when Drive
// doesn't report it. rotation 1/3 means the stored image is turned 90°, so width/height swap.
export const getDriveImageSize = async (fileId, accessToken) => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=imageMediaMetadata(width,height,rotation)&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const meta = (await res.json())?.imageMediaMetadata;
    if (!meta?.width || !meta?.height) return null;
    const turned = meta.rotation === 1 || meta.rotation === 3;
    return turned ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
};

// Keeps videos and correctly sized images. getSize(file) returns {width, height} or null;
// an image whose size can't be read is kept and left for TikTok to judge.
// Returns { kept, errors } — errors are ready-to-show messages for the dropped images.
export const filterTikTokImagesBySize = async (files, getSize = readImageSize) => {
  const results = await Promise.all(
    files.map(async (file) => {
      if (!isTikTokImageFile(file)) return { file, ok: true };
      const size = await getSize(file);
      if (!size || isSupportedTikTokImageSize(size)) return { file, ok: true };
      return { file, ok: false, error: tiktokImageSizeError(file.name, size) };
    }),
  );
  return {
    kept: results.filter((r) => r.ok).map((r) => r.file),
    errors: results.filter((r) => !r.ok).map((r) => r.error),
  };
};
