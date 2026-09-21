import { useCallback, useEffect, useState } from "react";

export default function useSortPreference(key, fallback) {
  const read = useCallback(() => {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }, [key, fallback]);
  const [value, setValue] = useState(read);
  useEffect(() => {
    const refresh = () => setValue(read());
    window.addEventListener("storage", refresh);
    window.addEventListener("settings-sort-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("settings-sort-changed", refresh);
    };
  }, [read]);
  const update = useCallback(next => {
    setValue(next);
    try { localStorage.setItem(key, next); } catch { /* Preference still works for this session. */ }
    window.dispatchEvent(new Event("settings-sort-changed"));
  }, [key]);
  return [value, update];
}
