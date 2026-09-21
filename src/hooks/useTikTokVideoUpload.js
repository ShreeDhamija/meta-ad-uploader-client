import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import pLimit from "p-limit";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|bmp)($|\?)/i;

/**
 * Classify a File (or Drive/Dropbox file descriptor) as an image.
 * Mirrors TikTokImageService.isImageFile() on the server so both ends agree
 * on which pipeline a given file belongs in.
 *
 * @param {{ type?: string, mimeType?: string, name?: string }} file
 * @returns {boolean}
 */
export function isTikTokImageFile(file) {
  if (!file) return false;
  const mime = file.type || file.mimeType || file.mimetype || "";
  if (mime.startsWith("image/")) return true;
  return IMAGE_EXTENSION_PATTERN.test(file.name || file.fileName || "");
}

/**
 * Hook for uploading media to TikTok via the backend upload pipeline.
 *
 * Videos and images take deliberately different routes:
 *  - uploadVideo(file, signal)     — local File, chunked S3 multipart, then TikTok fetches by URL
 *  - uploadVideoFromUrl(url)       — remote URL, server forwards it to TikTok
 *  - uploadImage(file, signal)     — local File posted straight to the server's image endpoint;
 *                                    images are small, so there is no S3 staging step
 *  - uploadImageFromUrl(url)       — remote URL, server hands it to TikTok's image endpoint
 *
 * Video calls resolve to a `videoId`; image calls resolve to an `imageId`. They are
 * different TikTok asset namespaces and must never be interchanged.
 *
 * @param {string} advertiserId  TikTok advertiser account ID
 * @returns {{ uploadVideo, uploadVideoFromUrl, uploadImage, uploadImageFromUrl, uploading, uploadProgress }}
 */
export function useTikTokVideoUpload(advertiserId) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Helper function to upload chunk with retry
  async function uploadChunkWithRetry(url, chunk, contentType, partNumber, maxRetries = 3, signal = null) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      try {
        return await axios.put(url, chunk, {
          headers: { 'Content-Type': contentType },
          signal, // This makes axios reject immediately on abort
        });
      } catch (error) {
        if (axios.isCancel(error) || error.name === 'AbortError' || signal?.aborted) {
          throw new DOMException('Cancelled', 'AbortError');
        }
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Helper function to upload to S3 directly from browser
  const uploadToS3 = async (file, onChunkUploaded, uniqueId, maxUploadRetries = 2, signal = null) => {
    if (!file) {
      console.error('❌ FATAL: No file provided to uploadToS3');
      throw new Error('No file provided for upload');
    }

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const limit = pLimit(5);

    let lastError = null;

    for (let uploadAttempt = 1; uploadAttempt <= maxUploadRetries; uploadAttempt++) {
      let uploadId = null;
      let s3Key = null;

      try {
        const startResponse = await axios.post(
          `${API_BASE_URL}/api/tiktok/s3/start-upload`,
          { fileName: file.name, fileType: file.type },
          { withCredentials: true, signal }
        );

        uploadId = startResponse.data.uploadId;
        s3Key = startResponse.data.key;

        if (!uploadId || !s3Key) {
          throw new Error('Invalid response from start-upload endpoint');
        }

        const urlsResponse = await axios.post(
          `${API_BASE_URL}/api/tiktok/s3/get-upload-urls`,
          { key: s3Key, uploadId, parts: totalChunks },
          { withCredentials: true, signal }
        );

        const presignedUrls = urlsResponse.data.parts;
        if (!presignedUrls || !Array.isArray(presignedUrls)) {
          throw new Error('Invalid presigned URLs response');
        }

        const uploadPromises = presignedUrls.map((part) => {
          const { partNumber, url } = part;
          const start = (partNumber - 1) * CHUNK_SIZE;
          const end = start + CHUNK_SIZE;
          const chunk = file.slice(start, end);

          return limit(async () => {
            try {
              const uploadResponse = await uploadChunkWithRetry(url, chunk, file.type, partNumber, 3, signal);
              if (onChunkUploaded && uploadAttempt === 1) {
                onChunkUploaded();
              }

              const etag = uploadResponse.headers.etag;
              if (!etag) {
                throw new Error(`No ETag received for part ${partNumber}`);
              }

              return { PartNumber: partNumber, ETag: etag.replace(/"/g, '') };
            } catch (chunkError) {
              console.error(`❌ Error uploading chunk ${partNumber}:`, chunkError.message);
              throw chunkError;
            }
          });
        });

        const completedParts = await Promise.all(uploadPromises);

        let completeResponse;
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            completeResponse = await axios.post(
              `${API_BASE_URL}/api/tiktok/s3/complete-upload`,
              { key: s3Key, uploadId, parts: completedParts },
              { withCredentials: true, signal }
            );
            break;
          } catch (error) {
            if (attempt === 5) throw error;
            const delay = 2000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        return {
          name: file.name,
          type: file.type,
          size: file.size,
          s3Url: completeResponse.data.publicUrl,
          isS3Upload: true,
          uniqueId
        };
      } catch (error) {
        lastError = error;

        if (axios.isCancel(error) || error.name === 'AbortError' || signal?.aborted) {
          if (uploadId && s3Key) {
            try {
              await axios.post(
                `${API_BASE_URL}/api/tiktok/s3/abort-upload`,
                { key: s3Key, uploadId },
                { withCredentials: true }
              );
            } catch (abortError) {
              console.error('Failed to abort S3 upload:', abortError.message);
            }
          }
          throw new DOMException(`Upload cancelled for ${file.name}`, 'AbortError');
        }

        if (uploadId && s3Key) {
          try {
            await axios.post(
              `${API_BASE_URL}/api/tiktok/s3/abort-upload`,
              { key: s3Key, uploadId },
              { withCredentials: true }
            );
          } catch (abortError) {
            console.error('Failed to abort upload:', abortError.message);
          }
        }

        if (uploadAttempt < maxUploadRetries) {
          await new Promise(resolve => setTimeout(resolve, 3000 * uploadAttempt));
        }
      }
    }

    throw new Error(`Failed to upload ${file.name} to S3 after ${maxUploadRetries} attempts: ${lastError?.message}`);
  };

  /**
   * Upload a local File object to TikTok via S3 multipart or XHR route.
   *
   * @param {File} file
   * @param {AbortSignal} [signal]
   * @returns {Promise<{ videoId: string, s3Url: string, fileName: string, data: object } | null>}
   */
  const uploadVideo = async (file, signal = null, onProgress = null) => {
    if (!advertiserId) {
      toast.error("No advertiser selected");
      return null;
    }
    if (!file) {
      toast.error("No file provided");
      return null;
    }

    console.log(`[useTikTokVideoUpload] Using S3 direct upload for file: ${file.name}`);
    setUploading(true);
    setUploadProgress(0);
    if (onProgress) onProgress(0);

    const totalChunks = Math.ceil(file.size / (10 * 1024 * 1024));
    let uploadedChunks = 0;

    try {
      const s3Result = await uploadToS3(
        file,
        () => {
          uploadedChunks++;
          const pct = Math.round((uploadedChunks / totalChunks) * 100);
          setUploadProgress(pct);
          if (onProgress) onProgress(pct);
        },
        file.name + "-" + file.size,
        2,
        signal
      );

      if (signal?.aborted) {
        throw new DOMException("Upload aborted", "AbortError");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tiktok/upload-video-s3?advertiserId=${encodeURIComponent(advertiserId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            s3Url: s3Result.s3Url,
            fileName: file.name
          }),
          signal
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "TikTok registration failed");
      }

      setUploadProgress(100);
      if (onProgress) onProgress(100);
      return data; // { videoId, s3Url, fileName, data }
    } catch (err) {
      setUploadProgress(0);
      if (onProgress) onProgress(0);
      if (err.name === "AbortError" || axios.isCancel(err) || signal?.aborted) {
        console.log("[useTikTokVideoUpload] S3 upload aborted successfully");
        throw new DOMException("Upload aborted", "AbortError");
      }
      toast.error(err.message || "S3 Upload failed");
      throw err;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Ask the server to download a video from an external URL and upload it
   * to both S3 and the TikTok asset library on behalf of the client.
   *
   * @param {string} videoUrl    Publicly accessible video URL
   * @param {string} [fileName]  Suggested filename (defaults to "video.mp4")
   * @returns {Promise<{ videoId: string, s3Url: string, fileName: string, data: object } | null>}
   */
  const uploadVideoFromUrl = async (videoUrl, fileName = "video.mp4") => {
    if (!advertiserId) {
      toast.error("No advertiser selected");
      return null;
    }
    if (!videoUrl) {
      toast.error("No URL provided");
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tiktok/upload-video-url?advertiserId=${encodeURIComponent(advertiserId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoUrl, fileName }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "URL upload failed");
      }

      return data;
    } catch (err) {
      toast.error(err.message || "URL upload failed");
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Upload a local image File to TikTok's asset library.
   *
   * Unlike videos there is no S3 multipart step — the file goes straight to the
   * server, which forwards it to TikTok and returns the image_id.
   *
   * @param {File} file
   * @param {AbortSignal} [signal]
   * @param {Function} [onProgress]
   * @returns {Promise<{ imageId: string, fileName: string, data: object }>}
   */
  const uploadImage = async (file, signal = null, onProgress = null) => {
    if (!advertiserId) {
      toast.error("No advertiser selected");
      return null;
    }
    if (!file) {
      toast.error("No file provided");
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const body = new FormData();
      body.append("image", file);

      const response = await fetch(`${API_BASE_URL}/api/tiktok/upload-image?advertiserId=${encodeURIComponent(advertiserId)}`, {
        method: "POST",
        credentials: "include",
        body,
        signal,
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.imageId) {
        throw new Error(data.error || `Image upload failed for "${file.name}"`);
      }

      setUploadProgress(100);
      if (onProgress) onProgress(100);
      return { imageId: data.imageId, fileName: data.fileName || file.name, data: data.data };
    } catch (err) {
      setUploadProgress(0);
      if (err.name === "AbortError" || axios.isCancel(err) || signal?.aborted) {
        throw new DOMException("Upload aborted", "AbortError");
      }
      throw err;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Ask the server to hand an already-hosted image URL to TikTok.
   *
   * @param {string} imageUrl   Publicly accessible image URL
   * @param {string} [fileName]
   * @returns {Promise<{ imageId: string, fileName: string, data: object } | null>}
   */
  const uploadImageFromUrl = async (imageUrl, fileName = "image.jpg") => {
    if (!advertiserId) {
      toast.error("No advertiser selected");
      return null;
    }
    if (!imageUrl) {
      toast.error("No URL provided");
      return null;
    }

    setUploading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tiktok/upload-image-url?advertiserId=${encodeURIComponent(advertiserId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, fileName }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.imageId) {
        throw new Error(data.error || "Image URL upload failed");
      }

      return { imageId: data.imageId, fileName: data.fileName || fileName, data: data.data };
    } catch (err) {
      toast.error(err.message || "Image URL upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadVideo, uploadVideoFromUrl, uploadImage, uploadImageFromUrl, uploading, uploadProgress };
}
