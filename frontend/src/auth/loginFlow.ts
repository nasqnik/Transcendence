import { loginParent, loginWithGoogle, decodeJWT } from '../api/auth'
import { getApiErrorKey, isKidNotActiveYet } from '../api/errors'
import { establishKidSession, establishParentSession, type NavigateFn } from './session'

export type LoginCredentials =
  | { type: 'password'; identifier: string; password: string }
  | { type: 'google'; credential: string }

export type DualLoginResult =
  | { status: 'success' }
  | { status: 'waiting_for_parent' }
  | { status: 'error'; errorKey: string }

export async function attemptDualRoleLogin(
  credentials: LoginCredentials,
  navigate?: NavigateFn,
): Promise<DualLoginResult> {
  try {
    const tokens =
      credentials.type === 'password'
        ? await loginParent(credentials.identifier, credentials.password)
        : await loginWithGoogle(credentials.credential)

    if (decodeJWT(tokens.access).role === 'kid') establishKidSession(tokens, navigate)
    else establishParentSession(tokens, navigate)

    return { status: 'success' }
  } catch (err) {

    if (isKidNotActiveYet(err)) {
      return { status: 'waiting_for_parent' }
    }
    return { status: 'error', errorKey: getApiErrorKey(err) }
  }
}
