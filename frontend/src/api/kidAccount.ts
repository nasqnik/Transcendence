import client from './client'

/**
 * The kid shape of `/auth/me/`. The endpoint is shared with parents — the
 * server picks the serializer from the token — but a kid profile carries
 * `name`, `avatar_url` and `registration_status`, and has no `role`.
 *
 * Password and email changes reuse the role-agnostic helpers in `./account`
 * (`changePassword`, `requestEmailChange`); the backend resolves the actor
 * from the token, so they work unchanged for a kid session.
 */
/**
 * A guardian on the kid's own profile, read-only.
 *
 * Only accepted guardians appear — a pending invitation is not listed — and the
 * primary comes first. The array is empty while the kid is still
 * `awaiting_primary_parent`, so callers must handle having no guardian at all
 * rather than reading `parents[0]`.
 */
export interface KidParent {
  id: string
  username: string
  email: string
  bio: string
  role: 'primary' | 'secondary'
}

/** A kid may have at most a primary and a secondary guardian. */
export const MAX_GUARDIANS = 2

export interface KidMeProfile {
  id: string
  name: string
  username: string
  bio: string
  email: string
  pending_email: string | null
  email_verified: boolean
  has_password: boolean
  avatar_url: string | null
  registration_status: string
  created_at: string
  parents: KidParent[]
}

/** GET /auth/me/ for a kid session. */
export async function getKidMe(): Promise<KidMeProfile> {
  const res = await client.get<KidMeProfile>('/auth/me/')
  return res.data
}

/** PATCH /auth/me/ — a kid may change name, username and bio. */
export async function updateKidProfile(
  patch: Partial<Pick<KidMeProfile, 'name' | 'username' | 'bio'>>,
): Promise<KidMeProfile> {
  const res = await client.patch<KidMeProfile>('/auth/me/', patch)
  return res.data
}
