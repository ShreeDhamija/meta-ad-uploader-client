const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

export function startTikTokOAuth() {
  const cleanApiUrl = API_BASE_URL.replace(/\/$/, "")
  window.location.href = `${cleanApiUrl}/auth/tiktok/login`
}
