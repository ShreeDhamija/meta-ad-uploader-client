const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// The server always lands TikTok OAuth on /tiktok-callback, so the page to come
// back to afterwards is kept client-side for the duration of the redirect.
const RETURN_TO_KEY = "tiktok_oauth_return_to"
const ALLOWED_RETURN_TO = new Set(["/tiktok-ads", "/tiktok-settings"])

export function startTikTokOAuth({ returnTo } = {}) {
  try {
    if (ALLOWED_RETURN_TO.has(returnTo)) sessionStorage.setItem(RETURN_TO_KEY, returnTo)
    else sessionStorage.removeItem(RETURN_TO_KEY)
  } catch {
    // Storage blocked: fall back to the default post-connect destination
  }
  const cleanApiUrl = API_BASE_URL.replace(/\/$/, "")
  window.location.href = `${cleanApiUrl}/auth/tiktok/login`
}

export function consumeTikTokOAuthReturnTo() {
  try {
    const returnTo = sessionStorage.getItem(RETURN_TO_KEY)
    sessionStorage.removeItem(RETURN_TO_KEY)
    return ALLOWED_RETURN_TO.has(returnTo) ? returnTo : null
  } catch {
    return null
  }
}
