export const AUTH_ROUTE_PATHS = new Set(["/login", "/signup"]);

const getCurrentPathname = () =>
  typeof window === "undefined" ? "" : window.location.pathname;

export const isAuthRoute = (pathname = getCurrentPathname()) =>
  AUTH_ROUTE_PATHS.has(pathname);
