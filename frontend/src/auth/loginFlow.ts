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

/**
 * Log in whoever this is — parent or kid — in a single request.
 *
 * `/auth/token/` and `/auth/google/` resolve the role server-side, so the role
 * comes back in the JWT rather than being discovered by trial. This used to
 * call the parent endpoint, let it fail, then call the kid one; that failure
 * was a real 400/401, and Chrome logs failed requests from the network layer
 * where no `try`/`catch` can suppress them. Every kid login printed a red
 * console error for a request that was working exactly as designed.
 *
 * The kid endpoints (`/auth/kid/token/`, `/auth/kid/google/`) still exist and
 * still work; nothing here depends on them any more.
 */
export async function attemptDualRoleLogin(
  credentials: LoginCredentials,
  navigate?: NavigateFn,
): Promise<DualLoginResult> {
  try {
    const tokens =
      credentials.type === 'password'
        ? await loginParent(credentials.identifier, credentials.password)
        : await loginWithGoogle(credentials.credential)

    // The session helpers decode the token themselves, but which one to call is
    // the question the two requests used to answer.
    if (decodeJWT(tokens.access).role === 'kid') establishKidSession(tokens, navigate)
    else establishParentSession(tokens, navigate)

    return { status: 'success' }
  } catch (err) {
    // A kid whose parent has not accepted the invitation yet gets their own
    // screen, not a login failure — they did nothing wrong and retrying will
    // not help.
    if (isKidNotActiveYet(err)) {
      return { status: 'waiting_for_parent' }
    }
    // One call, one error: no more guessing which of two failures to report.
    // Unverified email and a Google address already tied to another account
    // keep their distinct messages through getApiErrorKey.
    return { status: 'error', errorKey: getApiErrorKey(err) }
  }
}
