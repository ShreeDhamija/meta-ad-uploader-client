import pica from 'pica';

const MAX_DIMENSION = 9000;
const JPEG_QUALITY = 0.92;

let picaInstance;
const getPica = () => (picaInstance ||= pica());

const isResizableImage = (file) => {
  if (!file || typeof file.type !== 'string') return false;
  if (!file.type.startsWith('image/')) return false;
  // Skip animated/unsupported-for-canvas formats
  if (file.type === 'image/gif') return false;
  if (file.type === 'image/svg+xml') return false;
  return true;
};

async function resizeOne(file) {
  if (!isResizableImage(file)) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    console.warn('[resizeOversizedImage] decode failed, skipping:', file.name, err);
    return file;
  }

  const { width, height } = bitmap;
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    bitmap.close?.();
    return file;
  }

  const target = document.createElement('canvas');
  target.width = Math.max(1, Math.floor(width / 2));
  target.height = Math.max(1, Math.floor(height / 2));

  try {
    await getPica().resize(bitmap, target);
  } catch (err) {
    console.warn('[resizeOversizedImage] pica.resize failed, keeping original:', file.name, err);
    bitmap.close?.();
    target.width = 0;
    target.height = 0;
    return file;
  } finally {
    bitmap.close?.();
  }

  const outMime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const quality = outMime === 'image/jpeg' ? JPEG_QUALITY : undefined;

  let blob;
  try {
    blob = await getPica().toBlob(target, outMime, quality);
  } catch (err) {
    console.warn('[resizeOversizedImage] toBlob failed, keeping original:', file.name, err);
    return file;
  } finally {
    target.width = 0;
    target.height = 0;
  }

  const resized = new File([blob], file.name, {
    type: outMime,
    lastModified: file.lastModified || Date.now(),
  });

  // Keep any custom props the caller may have already tagged on the original
  for (const key of Object.keys(file)) {
    if (!(key in resized)) resized[key] = file[key];
  }

  return resized;
}

/**
 * Resize images whose width or height exceeds MAX_DIMENSION down to half-dimension.
 * Files are processed sequentially to keep peak memory low (one decoded image at a time).
 * onProgress is called as { done, total, resizedCount } after each file.
 * If a signal is provided and gets aborted, throws an AbortError.
 */
export async function resizeOversizedImages(files, onProgress, signal) {
  if (!files || files.length === 0) return files;

  const out = new Array(files.length);
  let resizedCount = 0;

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Image resize cancelled', 'AbortError');
    }
    const original = files[i];
    const result = await resizeOne(original);
    if (result !== original) resizedCount++;
    out[i] = result;
    onProgress?.({ done: i + 1, total: files.length, resizedCount });
  }

  return out;
}
