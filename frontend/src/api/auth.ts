import client from './client'

// ─── JWT helpers ────────────────────────────────────────────────────────────

// A JWT is three base64 strings joined by dots: header.payload.signature
// We only care about the payload, which contains user info the backend put there.
// We don't verify the signature on the frontend — the backend does that.
export function decodeJWT(token: string): Record<string, unknown> {
  try {
    // JWTs use base64url (- instead of +, _ instead of /) — convert before atob
    const payload = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}

// ─── API response types ──────────────────────────────────────────────────────

interface TokenResponse {
  access: string
  refresh: string
}

export interface KidSignupResponse {
  kid_id: string
  username: string
  name: string
  email: string | null
  email_verified: boolean
  registration_status: 'awaiting_primary_parent' | 'active' | 'suspended'
  message: string
}

export interface KidVerifyEmailResponse {
  kid_id: string
  email: string | null
  email_verified: boolean
  registration_status: 'awaiting_primary_parent' | 'active' | 'suspended'
  message: string
}

export interface ParentVerifyEmailResponse {
  email: string
  email_verified: boolean
  message: string
}

// ─── Auth endpoints ──────────────────────────────────────────────────────────

// POST /auth/token/  — login with emailOrUsername + password (works for both roles)
export async function login(identifier: string, password: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/token/', {
    emailOrUsername: identifier,
    password,
  })
  return res.data
}

// POST /auth/google/  — login via Google (does not create an account)
export async function loginWithGoogle(idToken: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/google/', { id_token: idToken })
  return res.data
}

// POST /auth/token/refresh/  — exchange a parent refresh token for a fresh
// access token (e.g. after linking a kid, so the new kid_ids land in the JWT).
export async function refreshParentToken(refresh: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/token/refresh/', { refresh })
  return res.data
}


// POST /auth/register/  — parent account creation
// Returns user info, no tokens — parent verifies email then logs in.
export async function signupParent(email: string, username: string, password: string) {
  const res = await client.post('/auth/register/', { email, username, password })
  return res.data
}

// GET /guardian-invitations/{token}/  — fetch invite details before accepting
export interface InvitationDetails {
  token: string
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
  role: 'primary' | 'secondary'
  invite_email: string
  invited_username_hint: string
  expires_at: string
  kid_name: string
  kid_id: string
}

export async function getInvitation(token: string): Promise<InvitationDetails> {
  // Public endpoint — do not send a stale JWT (can cause 401 before the view runs)
  const res = await client.get<InvitationDetails>(`/guardian-invitations/${token}/`, {
    skipAuth: true,
  })
  return res.data
}

// POST /guardian-invitations/accept/  — parent accepts the invite (requires parent JWT)
export async function acceptInvitation(token: string) {
  const res = await client.post('/guardian-invitations/accept/', { token })
  return res.data
}

// POST /auth/token/verify/ or /auth/kid/token/verify/
// Returns true if valid, false if expired or invalid.
// skipAuth: true — we're verifying the token itself, don't attach it as a header too.
export async function verifyAccessToken(token: string, role: 'parent' | 'kid'): Promise<boolean> {
  const path = role === 'kid' ? '/auth/kid/token/verify/' : '/auth/token/verify/'
  try {
    await client.post(path, { token }, { skipAuth: true })
    return true
  } catch {
    return false
  }
}

// POST /kids/invite-parent/  — kid invites a second guardian (requires kid JWT)
export async function inviteParent(parentEmail: string, invitedUsernameHint?: string) {
  const res = await client.post('/kids/invite-parent/', {
    parent_email: parentEmail,
    ...(invitedUsernameHint ? { invited_username_hint: invitedUsernameHint } : {}),
  })
  return res.data
}



// POST /auth/google/signup/  — parent sign-up via Google (creates if new)
export async function signupParentWithGoogle(idToken: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/google/signup/', { id_token: idToken })
  return res.data
}


/** One in-flight verify POST per token (avoids Strict Mode double-submit). */
function dedupeByToken<T>(cache: Map<string, Promise<T>>, token: string, request: () => Promise<T>): Promise<T> {
  const existing = cache.get(token)
  if (existing) return existing
  const promise = request().finally(() => cache.delete(token))
  cache.set(token, promise)
  return promise
}

const parentVerifyByToken = new Map<string, Promise<ParentVerifyEmailResponse>>()
const kidVerifyByToken = new Map<string, Promise<KidVerifyEmailResponse>>()

// POST /auth/verify-email/  — parent confirms their email after registration
export function verifyParentEmail(token: string): Promise<ParentVerifyEmailResponse> {
  return dedupeByToken(parentVerifyByToken, token, async () => {
    const res = await client.post<ParentVerifyEmailResponse>('/auth/verify-email/', { token }, { skipAuth: true })
    return res.data
  })
}

// POST /auth/kid/verify-email/  — kid confirms their email after registration
export function verifyKidEmail(token: string): Promise<KidVerifyEmailResponse> {
  return dedupeByToken(kidVerifyByToken, token, async () => {
    const res = await client.post<KidVerifyEmailResponse>('/auth/kid/verify-email/', { token }, { skipAuth: true })
    return res.data
  })
}

// POST /kids/signup/google/  — kid registration via Google (no kid email verify step; parent still needs to accept)
export async function signupKidWithGoogle(
  idToken: string,
  name: string,
  username: string,
  parentEmail: string,
): Promise<KidSignupResponse> {
  const res = await client.post<KidSignupResponse>('/kids/signup/google/', {
    id_token: idToken,
    name,
    username,
    parent_email: parentEmail,
  })
  return res.data
}

// POST /kids/signup/  — kid registration
// Kid can't log in until a parent accepts the email invitation
export async function signupKid(
  name: string,
  username: string,
  email: string,
  password: string,
  parentEmail: string,
): Promise<KidSignupResponse> {
  const res = await client.post<KidSignupResponse>('/kids/signup/', {
    name,
    username,
    email,
    password,
    parent_email: parentEmail,
  })
  return res.data
}

// ─── Password reset ───────────────────────────────────────────────────────────

/**
 * Ask for a reset link.
 *
 * Parent and kid have separate endpoints, and an email address cannot tell you
 * which — asking the person would leak whether an account exists. Both are
 * called, mirroring the dual-role login: the backend forbids a kid and a parent
 * sharing an address, so at most one sends mail, and both answer with the same
 * message either way so nothing is revealed.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  // skipAuth on both: this is reachable from settings while signed in, and a
  // stale or wrong-role token attached to a public endpoint can only turn a
  // working request into a 401.
  const results = await Promise.allSettled([
    client.post('/auth/password-reset/', { email }, { skipAuth: true }),
    client.post('/auth/kid/password-reset/', { email }, { skipAuth: true }),
  ])
  // One success is enough: an address belongs to a parent or a kid, never both,
  // and the endpoint answers 200 either way — so a single rejection says
  // nothing about whether mail went out. Only when *every* call failed is it
  // certain nothing was sent, and that must not be reported as "check your
  // email". `allSettled` never rejects on its own, so without this the caller's
  // error path is unreachable and an offline device sees a success screen.
  if (results.every(r => r.status === 'rejected')) {
    throw (results[0] as PromiseRejectedResult).reason
  }
}

/** Set a new password from an emailed token. The route decides whose. */
export async function confirmPasswordReset(
  role: 'parent' | 'kid',
  token: string,
  newPassword: string,
): Promise<void> {
  const path = role === 'kid'
    ? '/auth/kid/password-reset/confirm/'
    : '/auth/password-reset/confirm/'
  // skipAuth: the link is followed from an inbox, possibly on a device already
  // signed in as someone else. The reset token in the body is the credential.
  await client.post(path, { token, new_password: newPassword }, { skipAuth: true })
}
