import { useState } from "react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";

/**
 * Hook for uploading videos to TikTok via the backend upload pipeline.
 *
 * Supports two modes:
 *  - uploadVideo(file)           — local File object, uses XHR for upload-progress tracking
 *  - uploadVideoFromUrl(url)     — remote URL, asks the server to download & forward it
 *
 * Both paths go through the same dual-step backend flow:
 *   1. Save to S3 (tiktok/<advertiserId>/<ts>-<name>)
 *   2. Sync to TikTok asset library via /file/video/ad/upload/
 *
 * @param {string} advertiserId  TikTok advertiser account ID
 * @returns {{ uploadVideo, uploadVideoFromUrl, uploading, uploadProgress }}
 */
export function useTikTokVideoUpload(advertiserId) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload a local File object to TikTok via the multipart upload route.
   * Uses XMLHttpRequest so we can report real-time upload progress.
   *
   * @param {File} file
   * @returns {Promise<{ videoId: string, s3Url: string, fileName: string, data: object } | null>}
   */
  const uploadVideo = async (file) => {
    if (!advertiserId) {
      console.warn("⚠️ [TikTok Upload Hook] Failed: No advertiser selected.");
      toast.error("No advertiser selected");
      return null;
    }
    if (!file) {
      console.warn("⚠️ [TikTok Upload Hook] Failed: No file provided.");
      toast.error("No file provided");
      return null;
    }

    console.log("🚀 [TikTok Upload Hook] Video upload sequence initialized:");
    console.log("  📂 File Name  :", file.name);
    console.log("  📦 File Size  :", `${(file.size / 1024 / 1024).toFixed(2)} MB (${file.size} bytes)`);
    console.log("  🏷️ MimeType   :", file.type || "N/A");
    console.log("  🔑 Advertiser :", advertiserId);

    setUploading(true);
    setUploadProgress(0);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      // Field name MUST be "videoFile" — this is what the multer middleware expects
      formData.append("videoFile", file);

      console.log("📡 [TikTok Upload Hook] Created FormData. Initializing XMLHttpRequest...");
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          console.log(`⏳ [TikTok Upload Hook] Progress: ${pct}% (${e.loaded}/${e.total} bytes)`);
          setUploadProgress(pct);
        } else {
          console.log(`⏳ [TikTok Upload Hook] Progress: ${e.loaded} bytes uploaded (total size unknown)`);
        }
      });

      xhr.addEventListener("load", () => {
        console.log(`📥 [TikTok Upload Hook] XHR response received. HTTP Status: ${xhr.status}`);
        setUploading(false);
        setUploadProgress(0);

        if (xhr.status === 200) {
          let data;
          try {
            data = JSON.parse(xhr.responseText);
            console.log("✅ [TikTok Upload Hook] Response parsed successfully:", data);
          } catch (parseErr) {
            console.error("❌ [TikTok Upload Hook] Failed to parse JSON response. Raw Response:", xhr.responseText);
            const msg = "Server returned non-JSON response";
            toast.error(msg);
            return reject(new Error(msg));
          }

          if (data.success && data.videoId) {
            console.log(`✅ [TikTok Upload Hook] SUCCESS! Registered TikTok Video ID: ${data.videoId}`);
            toast.success(`Video uploaded! ID: ${data.videoId}`);
            return resolve(data); // { videoId, s3Url, fileName, data: { video_id, … } }
          }

          const msg = data.error || "Upload failed";
          console.warn("⚠️ [TikTok Upload Hook] Server reported failure status:", data);
          toast.error(msg);
          reject(new Error(msg));
        } else {
          let errMsg = "Upload failed";
          try {
            const errData = JSON.parse(xhr.responseText);
            console.error("❌ [TikTok Upload Hook] Server returned non-200 status. Details:", errData);
            errMsg = errData.error || errMsg;
          } catch (jsonErr) {
            console.error(`❌ [TikTok Upload Hook] Server returned non-200 status (${xhr.status}). Raw Response:`, xhr.responseText);
          }
          toast.error(errMsg);
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener("error", (err) => {
        console.error("❌ [TikTok Upload Hook] Network error occurred during upload. Event:", err);
        setUploading(false);
        setUploadProgress(0);
        toast.error("Network error during upload");
        reject(new Error("Network error"));
      });

      xhr.addEventListener("abort", () => {
        console.warn("⚠️ [TikTok Upload Hook] Upload session was aborted.");
        setUploading(false);
        setUploadProgress(0);
        reject(new Error("Upload aborted"));
      });

      // advertiserId is a query param because the body is multipart/form-data
      const uploadUrl = `${API_BASE_URL}/api/tiktok/upload-video?advertiserId=${encodeURIComponent(advertiserId)}`;
      console.log(`📡 [TikTok Upload Hook] Opening connection: POST ${uploadUrl}`);
      xhr.open("POST", uploadUrl);

      // Auth headers — mirrors the server-side resolution order
      const tiktokUserId = localStorage.getItem("tiktok_uid") ||
        localStorage.getItem("tiktokUserId");
      const tiktokToken = localStorage.getItem("tiktok_token") ||
        localStorage.getItem("tiktokAccessToken");

      console.log(`📡 [TikTok Upload Hook] Setting credentials: tiktok_uid=${tiktokUserId ? 'YES' : 'NO'}, tiktok_token=${tiktokToken ? 'YES' : 'NO'}`);

      if (tiktokUserId) xhr.setRequestHeader("x-tiktok-user-id", tiktokUserId);
      if (tiktokToken) xhr.setRequestHeader("x-tiktok-token", tiktokToken);

      // Include session cookie for server-side session recovery
      xhr.withCredentials = true;

      console.log("📡 [TikTok Upload Hook] Sending payload...");
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
      const tiktokToken = localStorage.getItem("tiktok_token") ||
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
            ...(tiktokToken && { "x-tiktok-token": tiktokToken }),
            ...(tiktokUserId && { "x-tiktok-user-id": tiktokUserId }),
          },
          body: JSON.stringify({ videoUrl, fileName }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "URL upload failed");
      }

      toast.success(`Video uploaded! ID: ${data.videoId}`);
      return data; // { videoId, s3Url, fileName, data: { video_id, … } }
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
