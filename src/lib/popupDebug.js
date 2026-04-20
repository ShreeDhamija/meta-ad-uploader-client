const IS_STAGING = import.meta.env.VITE_APP_ENV === "staging";

export function logPopupDebug(label, details = {}, { trace = false } = {}) {
    if (!IS_STAGING || typeof window === "undefined") return;

    const timestamp = new Date().toISOString();
    const route = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    console.groupCollapsed(`[PopupDebug] ${timestamp} ${label}`);
    console.log("route", route);

    Object.entries(details).forEach(([key, value]) => {
        console.log(key, value);
    });

    if (trace) {
        console.trace("[PopupDebug trace]");
    }

    console.groupEnd();
}
