import { useEffect, useState } from "react";
import { creativeApi } from "@/lib/creativeApi";

// Only edited operations travel with a request. The backend resolves every
// other operation from the latest saved profile and snapshots the entire run.
export function useRunModels(scopeKey) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState({ scopeKey, selections: {} });
  const selections = draft.scopeKey === scopeKey ? draft.selections : {};

  useEffect(() => {
    let active = true;
    setCatalog(null);
    setError(null);
    creativeApi.getModels().then(data => {
      if (active) setCatalog(data);
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [scopeKey, reload]);

  useEffect(() => { setDraft({ scopeKey, selections: {} }); }, [scopeKey]);

  const change = (operation, value) => setDraft(current => ({
    scopeKey,
    selections: { ...(current.scopeKey === scopeKey ? current.selections : {}), [operation]: value },
  }));
  const reset = (operations) => setDraft(current => current.scopeKey !== scopeKey ? current : ({
    scopeKey,
    selections: Object.fromEntries(Object.entries(current.selections).filter(([id]) => !operations.includes(id))),
  }));

  return {
    catalog, error, selections, change, reset,
    retry: () => setReload(value => value + 1),
    forRun: (operations) => Object.fromEntries(Object.entries(selections).filter(([id]) => operations.includes(id))),
  };
}
