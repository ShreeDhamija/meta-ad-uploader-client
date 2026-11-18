// Single source of truth for "is this a non-production build?", used to gate
// unreleased pages (Creative Strategy, Library) and their nav entries.
//
// True on staging.withblip.com, dev.withblip.com, any Vercel preview deploy,
// and local dev. Vercel inlines VITE_VERCEL_ENV at build time ("production",
// "preview" or "development") when system env vars are exposed; the hostname
// check keeps this working if that variable is ever missing.
const VERCEL_ENV = import.meta.env.VITE_VERCEL_ENV;
const HOSTNAME = typeof window !== "undefined" ? window.location.hostname : "";
const STAGING_HOSTS = ["staging.withblip.com", "dev.withblip.com", "localhost", "127.0.0.1"];

export const IS_STAGING =
  import.meta.env.DEV ||
  VERCEL_ENV === "preview" ||
  VERCEL_ENV === "development" ||
  STAGING_HOSTS.some((host) => HOSTNAME.includes(host));
