const CACHE_PREFIX = 'blip_cache_v1_';
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const k = (name) => `${CACHE_PREFIX}${name}`;

export const readCache = (name) => {
  try {
    const raw = localStorage.getItem(k(name));
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > TTL_MS) {
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