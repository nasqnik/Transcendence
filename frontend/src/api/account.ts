import client from './client'

export interface MeProfile {
  id: string
  email: string
  pending_email: string | null
  username: string
  role: 'parent' | 'kid'
  email_verified: boolean
  has_password: boolean
  created_at: string
}

/** GET /auth/me/ */
export async function getMe(): Promise<MeProfile> {
  const res = await client.get<MeProfile>('/auth/me/')
  return res.data
}

/** PATCH /auth/me/ */
export async function updateUsername(username: string): Promise<MeProfile> {
  const res = await client.patch<MeProfile>('/auth/me/', { username })
  return res.data
}

/** POST /auth/me/password/  */
export async function changePassword(input: { current_password?: string; new_password: string }): Promise<void> {
  await client.post('/auth/me/password/', input)
}

/** POST /auth/me/email/ */
export async function requestEmailChange(email: string): Promise<void> {
  await client.post('/auth/me/email/', { email })
}

/** POST /auth/verify-email-change/ — confirm a pending email change via token. */
export async function verifyEmailChange(token: string): Promise<void> {
  await client.post('/auth/verify-email-change/', { token })
}
