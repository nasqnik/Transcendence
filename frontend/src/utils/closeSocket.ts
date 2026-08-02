/**
 * Detach a WebSocket and close it safely, for use in an effect cleanup.
 *
 * Two details are easy to get wrong and were duplicated in both socket hooks:
 *
 *  - Handlers must be detached first, or teardown can schedule a reconnect or
 *    write to a query cache that is itself being torn down.
 *  - Closing a socket still in CONNECTING logs "closed before the connection is
 *    established" on every StrictMode remount in dev, so the close is deferred
 *    until it opens.
 *
 * Kept as one function so a fix to either detail cannot land in one hook and
 * be missed in the other.
 */
export function closeSocket(socket: WebSocket | null): void {
  if (!socket) return
  socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null
  if (socket.readyState === WebSocket.CONNECTING) {
    // Deferred until the handshake resolves either way. Waiting only on
    // `onopen` leaked every socket whose connection failed — onopen never
    // fires, so close() was never called and the socket sat in CONNECTING.
    socket.onopen = () => socket.close()
    socket.onerror = () => socket.close()
    socket.onclose = () => { socket.onopen = socket.onerror = socket.onclose = null }
  } else {
    socket.close()
  }
}
