const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

// True only for an actual `vite dev` server reached from the developer's own
// machine. import.meta.env.DEV alone is a build-time constant — false for
// any production build, but it wouldn't catch a dev server started with
// `vite dev --host` and reached over the LAN, so this also checks the
// hostname the page was actually loaded from.
export function isLocalDevEnvironment(): boolean {
  if (!import.meta.env.DEV) return false;
  // No `window` (e.g. this module's dev-only guards running under Vitest's
  // Node test environment) — there's no untrusted network hop to worry
  // about, so treat it the same as a local dev server.
  if (typeof window === 'undefined') return true;
  return LOCAL_HOSTNAMES.has(window.location.hostname);
}
