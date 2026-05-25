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

// POST /auth/token/  — parent login with emailOrUsername + password
export async function loginParent(identifier: string, password: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/token/', {
    emailOrUsername: identifier,
    password,
  })
  return res.data
}

// POST /auth/kid/token/  — kid login with emailOrUsername + password
export async function loginKid(identifier: string, password: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/kid/token/', {
    emailOrUsername: identifier,
    password,
  })
  return res.data
}

// POST /auth/register/  — parent account creation
// Returns user info, no tokens — parent verifies email then logs in.
export async function registerParent(email: string, username: string, password: string) {
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

// POST /auth/google/  — parent sign-in / sign-up via Google Identity Services
export async function loginWithGoogle(idToken: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/google/', { id_token: idToken })
  return res.data
}

// POST /auth/kid/google/  — kid sign-in via Google (kid must be active)
export async function loginKidWithGoogle(idToken: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/kid/google/', { id_token: idToken })
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
