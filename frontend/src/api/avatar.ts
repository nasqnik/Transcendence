import client from './client'

export interface ParentAvatar {
  id: string
  parent_id: string
  profile_picture: string | null
  updated_at: string
}

/** GET /catalog/parent/avatar/ — the parent's uploaded profile picture (or null). */
export async function getParentAvatar(): Promise<ParentAvatar> {
  const res = await client.get<ParentAvatar>('/catalog/parent/avatar/')
  return res.data
}

/** POST /catalog/parent/avatar/upload/ — multipart image (JPEG/PNG/WebP, ≤2MB). */
export async function uploadParentAvatar(file: File): Promise<ParentAvatar> {
  const form = new FormData()
  form.append('profile_picture', file)
  const res = await client.post<ParentAvatar>('/catalog/parent/avatar/upload/', form)
  return res.data
}

/** DELETE /catalog/parent/avatar/ — remove the uploaded picture.
 *  Requires a `delete` method on the backend ParentAvatarView (see below). */
export async function deleteParentAvatar(): Promise<void> {
  await client.delete('/catalog/parent/avatar/')
}
