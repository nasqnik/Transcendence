/**
 * WebSocket origin derived from the REST base URL.
 *
 * Both socket hooks derived this identically; a change to the scheme or the
 * `/api` suffix had to be made in two places or one socket would silently
 * point at the wrong host.
 */
export const WS_BASE = (import.meta.env.VITE_API_URL ?? 'https://localhost/api')
  // Both schemes: an http:// API base (any local setup that is not behind the
  // TLS gateway) used to pass through untouched, and `new WebSocket('http://…')`
  // throws — so the sockets never connected at all and nothing said so.
  .replace(/^https:/, 'wss:')
  .replace(/^http:/, 'ws:')
  // Anchored: an unanchored '/api' would also eat the segment out of a host
  // or path that merely contained it.
  .replace(/\/api\/?$/, '')
