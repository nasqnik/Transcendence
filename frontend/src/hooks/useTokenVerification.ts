import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getApiErrorKey } from '../api/errors'

export type VerificationState = 'loading' | 'success' | 'error'

/**
 * Only a token the server reports as *already verified* reads as success.
 *
 * `invalidVerificationToken` used to be in this list on the assumption that an
 * unrecognised token meant the link had been followed once already. That also
 * swallowed genuinely corrupt, truncated and wrong-account links, greeting the
 * user with "you're verified!" when nothing had been verified — the failure
 * mode is silent and the user has no reason to try again. A backend that
 * cannot distinguish the two should be fixed there; the frontend should not
 * guess on the user's behalf.
 *
 * Exported because VerifyKidEmail applies the same rule but cannot use the
 * hook — it has a fourth state driven by the response body.
 */
export const ALREADY_VERIFIED_KEYS = [
  'errors.api.alreadyVerified',
]

/**
 * The shared shape of every "you clicked a link in an email" page: read the
 * token from the query string, call the matching endpoint once, and end in
 * success or error.
 *
 * Three pages had their own copy, including two details that are easy to get
 * subtly different and were worth having in one place:
 *
 *  - the `cancelled` guard, so a resolved request cannot set state after the
 *    page has unmounted;
 *  - re-running only on `token`, never on a language change — otherwise
 *    switching language re-submits a single-use token, which the server has
 *    already consumed, turning a verified account into an error screen.
 *
 * Focus is moved to the page heading once the outcome is known, so a screen
 * reader announces the result rather than leaving the user on a stale
 * "verifying…" message.
 */
export function useTokenVerification(
  headingId: string,
  verify: (token: string) => Promise<unknown>,
  /** Error keys that should land on success instead — see ALREADY_VERIFIED_KEYS. */
  treatAsSuccess: string[] = [],
) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<VerificationState>(() => (token ? 'loading' : 'error'))
  const [errorMessageKey, setErrorMessageKey] = useState(() => (token ? '' : 'verify.invalidLink'))

  useEffect(() => {
    if (state !== 'loading') document.getElementById(headingId)?.focus()
  }, [state, headingId])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    verify(token)
      .then(() => { if (!cancelled) setState('success') })
      .catch(err => {
        if (cancelled) return
        const key = getApiErrorKey(err)
        if (treatAsSuccess.includes(key)) { setState('success'); return }
        setErrorMessageKey(key)
        setState('error')
      })

    return () => { cancelled = true }
    // Deliberately only `token`: `verify` is redefined on every render by
    // callers, and re-running would resubmit a single-use token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return { state, errorMessageKey, token }
}
