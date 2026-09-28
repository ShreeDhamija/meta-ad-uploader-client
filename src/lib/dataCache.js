const CACHE_PREFIX = 'blip_cache_v1_';
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const k = (name) => `${CACHE_PREFIX}${name}`;

export const readCache = (name, ttlMs = TTL_MS) => {
  try {
    const raw = localStorage.getItem(k(name));
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt >= ttlMs) {
      localStorage.removeItem(k(name));
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

export const writeCache = (name, data) => {
  try {
    localStorage.setItem(k(name), JSON.stringify({ data, savedAt: Date.now() }));
  } catch (e) {
    console.warn('Cache write failed', e);
  }
};

export const clearCache = (name) => {
  if (!name) void clearPartnersCache();
  try {
    if (name) {
      localStorage.removeItem(k(name));
    } else {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    }
  } catch { }
};

export const clearAnalyticsCache = () => {
  try {
    localStorage.removeItem('analytics-selected-ad-account')
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('analytics-'))
      .forEach((key) => sessionStorage.removeItem(key))
  } catch { }
};

export const clearTikTokSessionData = () => {
  try {
    [
      'tiktok_uid',
      'tiktok_token',
      'tiktok_advertiser_ids',
      'tiktok_user',
      'tiktok_ads_cache',
      'last_selected_tiktok_advertiser',
      'tiktokAdvertiserSettings_draft',
    ].forEach((key) => localStorage.removeItem(key));
    clearCache('tiktokAdvertisers');
    clearCache('tiktokIdentities');
    clearCache('tiktokSettings');
  } catch { }
};

// Partner lists use the same localStorage format as the other app caches.
const PARTNERS_CACHE_NAME = 'partnershipPartners:';
export const PARTNERS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let generation = 0;

export const partnersCacheGeneration = () => generation;
export const partnersCacheKey = (apiBase, userId, pageId, instagramAccountId) =>
  userId && pageId && instagramAccountId
    ? JSON.stringify([apiBase, userId, pageId, instagramAccountId])
    : null;

export const readPartnersCache = (key) => {
  if (!key) return null;
  const partners = readCache(PARTNERS_CACHE_NAME + key, PARTNERS_TTL_MS);
  return Array.isArray(partners) ? partners : null;
};

export const writePartnersCache = (key, partners, expectedGeneration = generation) => {
  if (!key || expectedGeneration !== generation) return;
  // Reclaim expired partner entries across accounts before adding a complete
  // list. If storage is still full, writeCache catches the quota error and the
  // live result remains usable; other app data is never evicted to make room.
  try {
    Object.keys(localStorage)
      .filter((storageKey) => storageKey.startsWith(k(PARTNERS_CACHE_NAME)))
      .forEach((storageKey) => {
        const name = storageKey.slice(CACHE_PREFIX.length);
        if (!Array.isArray(readCache(name, PARTNERS_TTL_MS))) clearCache(name);
      });
  } catch { /* Storage can be unavailable in restricted browser contexts. */ }
  writeCache(PARTNERS_CACHE_NAME + key, partners);
};

export const clearPartnersCache = () => {
  generation += 1; // Prevent pre-logout requests from repopulating the cache.
  try {
    Object.keys(localStorage)
      .filter((storageKey) => storageKey.startsWith(k(PARTNERS_CACHE_NAME)))
      .forEach((storageKey) => localStorage.removeItem(storageKey));
  } catch { /* Cache clearing is best-effort when browser storage is blocked. */ }
};
