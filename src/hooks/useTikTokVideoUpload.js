import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import pLimit from "p-limit";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const S3_UPLOAD_THRESHOLD = 1 * 1024 * 1024; // 1 MB

/**
 * Hook for uploading videos to TikTok via the backend upload pipeline.
 *
 * Supports two modes:
 *  - uploadVideo(file, signal)   — local File object, uses chunked S3 direct or XHR upload
 *  - uploadVideoFromUrl(url)     — remote URL, asks the server to download & forward it
 *
 * @param {string} advertiserId  TikTok advertiser account ID
 * @returns {{ uploadVideo, uploadVideoFromUrl, uploading, uploadProgress }}
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
  const uploadVideo = async (file, signal = null) => {
    if (!advertiserId) {
      toast.error("No advertiser selected");
      return null;
    }
    if (!file) {
      toast.error("No file provided");
      return null;
    }

    // --- S3 DIRECT CHUNKED PATH FOR LARGE FILES ---
    if (file.size > S3_UPLOAD_THRESHOLD) {
      console.log(`[useTikTokVideoUpload] File size (${file.size} bytes) exceeds threshold. Using S3 chunked upload...`);
      setUploading(true);
      setUploadProgress(0);

      const totalChunks = Math.ceil(file.size / (10 * 1024 * 1024));
      let uploadedChunks = 0;

      try {
        const s3Result = await uploadToS3(
          file,
          () => {
            uploadedChunks++;
            const pct = Math.round((uploadedChunks / totalChunks) * 90); // Use 0-90% for S3 upload
            setUploadProgress(pct);
          },
          file.name + "-" + file.size,
          2,
          signal
        );

        if (signal?.aborted) {
          throw new DOMException("Upload aborted", "AbortError");
        }

        // Hit the new S3-specific video sync route
        const tiktokToken  = localStorage.getItem("tiktok_token") ||
                             localStorage.getItem("tiktokAccessToken");
        const tiktokUserId = localStorage.getItem("tiktok_uid") ||
                             localStorage.getItem("tiktokUserId");

        const response = await fetch(
          `${API_BASE_URL}/api/tiktok/upload-video-s3?advertiserId=${encodeURIComponent(advertiserId)}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(tiktokToken  && { "x-tiktok-token":   tiktokToken }),
              ...(tiktokUserId && { "x-tiktok-user-id": tiktokUserId }),
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
        return data; // { videoId, s3Url, fileName, data }
      } catch (err) {
        setUploadProgress(0);
        if (err.name === "AbortError" || axios.isCancel(err) || signal?.aborted) {
          console.log("[useTikTokVideoUpload] Chunked S3 upload aborted successfully");
          throw new DOMException("Upload aborted", "AbortError");
        }
        toast.error(err.message || "S3 Upload failed");
        throw err;
      } finally {
        setUploading(false);
      }
    }

    // --- STANDARD XHR PATH FOR SMALL FILES ---
    console.log(`[useTikTokVideoUpload] File size (${file.size} bytes) is below threshold. Using standard upload...`);
    setUploading(true);
    setUploadProgress(0);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("videoFile", file);

      const xhr = new XMLHttpRequest();

      const onAbortHandler = () => {
        xhr.abort();
      };

      if (signal) {
        signal.addEventListener("abort", onAbortHandler);
      }

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
        }
      });

      xhr.addEventListener("load", () => {
        if (signal) {
          signal.removeEventListener("abort", onAbortHandler);
        }
        setUploading(false);
        setUploadProgress(0);

        if (xhr.status === 200) {
          let data;
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            const msg = "Server returned non-JSON response";
            toast.error(msg);
            return reject(new Error(msg));
          }

          if (data.success && data.videoId) {
            return resolve(data);
          }

          const msg = data.error || "Upload failed";
          toast.error(msg);
          reject(new Error(msg));
        } else {
          let errMsg = "Upload failed";
          try {
            errMsg = JSON.parse(xhr.responseText)?.error || errMsg;
          } catch {}
          toast.error(errMsg);
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener("error", () => {
        if (signal) {
          signal.removeEventListener("abort", onAbortHandler);
        }
        setUploading(false);
        setUploadProgress(0);
        toast.error("Network error during upload");
        reject(new Error("Network error"));
      });

      xhr.addEventListener("abort", () => {
        if (signal) {
          signal.removeEventListener("abort", onAbortHandler);
        }
        setUploading(false);
        setUploadProgress(0);
        reject(new DOMException("Upload aborted", "AbortError"));
      });

      xhr.open(
        "POST",
        `${API_BASE_URL}/api/tiktok/upload-video?advertiserId=${encodeURIComponent(advertiserId)}`
      );

      const tiktokUserId = localStorage.getItem("tiktok_uid") ||
                           localStorage.getItem("tiktokUserId");
      const tiktokToken  = localStorage.getItem("tiktok_token") ||
                           localStorage.getItem("tiktokAccessToken");
      if (tiktokUserId) xhr.setRequestHeader("x-tiktok-user-id", tiktokUserId);
      if (tiktokToken)  xhr.setRequestHeader("x-tiktok-token", tiktokToken);

      xhr.withCredentials = true;
      xhr.send(formData);
    });
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
      const tiktokToken  = localStorage.getItem("tiktok_token") ||
                           localStorage.getItem("tiktokAccessToken");
      const tiktokUserId = localStorage.getItem("tiktok_uid") ||
                           localStorage.getItem("tiktokUserId");

      const response = await fetch(
        `${API_BASE_URL}/api/tiktok/upload-video-url?advertiserId=${encodeURIComponent(advertiserId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(tiktokToken  && { "x-tiktok-token":   tiktokToken }),
            ...(tiktokUserId && { "x-tiktok-user-id": tiktokUserId }),
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

  return { uploadVideo, uploadVideoFromUrl, uploading, uploadProgress };
}
