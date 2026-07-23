const STORAGE_KEY = 'pendingInviteToken'
const REGISTERED_KEY = 'pendingInviteRegistered'

export function savePendingInviteToken(token: string) {
  sessionStorage.setItem(STORAGE_KEY, token)
}

export function getPendingInviteToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}

export function clearPendingInviteToken() {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(REGISTERED_KEY)
}

// Set once the parent registers a brand-new account from the invite form, so
// that when they come back after verifying their email, the form can show
// "log in" instead of "accept" again (that submission only registers — it
// doesn't accept anything yet).
export function markPendingInviteRegistered() {
  sessionStorage.setItem(REGISTERED_KEY, 'true')
}

export function wasPendingInviteRegistered(): boolean {
  return sessionStorage.getItem(REGISTERED_KEY) === 'true'
}

export function acceptInvitePath(token: string): string {
  return `/accept-invite?token=${encodeURIComponent(token)}`
}
