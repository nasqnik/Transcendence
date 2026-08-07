import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { establishParentSession, parentUserFromAccessToken } from '../auth/session'
import useAuthStore from '../store/authStore'
import {
  getInvitation,
  acceptInvitation,
  loginParent,
  signupParentWithGoogle,
  registerParent,
  type InvitationDetails,
} from '../api/auth'
import {
  isAccountNotFound,
  isEmailNotVerified,
  isInvitationAlreadyAccepted,
  getApiErrorKey,
  getFieldErrors,
} from '../api/errors'
import {
  clearPendingInviteToken,
  savePendingInviteToken,
  markPendingInviteRegistered,
  wasPendingInviteRegistered,
} from '../utils/inviteToken'
import { useAuthHydrated } from './useAuthHydrated'
import { useFormErrors } from './useFormErrors'
import { emailsMatchIgnoreCase, isEmpty, validatePasswordField } from '../utils/validation'

export type InviteState =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'form'; invitation: InvitationDetails }
  | { status: 'wrong_account'; invitation: InvitationDetails; loggedInEmail: string }
  | { status: 'verify_email'; email: string }
  | { status: 'accepting' }
  | { status: 'success'; kidName: string }

/**
 * Everything that decides *what* the accept-invite page shows: loading the
 * invitation, the three ways a parent can end up accepting it (already signed
 * in, password, Google), and the side effects that survive a round trip
 * through email verification.
 *
 * Lifted out of the page because it is the most branching flow in the app —
 * seven states, three async entry points, and sessionStorage that has to
 * outlive a redirect — with the rendering wrapped around it, none of it could
 * be tested without driving the whole screen. The page below is now only
 * markup per state.
 */
export function useInviteAcceptance() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const hydrated = useAuthHydrated()
  const { isAuthenticated, currentUser } = useAuthStore()
  const inviteToken = searchParams.get('token')

  const [state, setState] = useState<InviteState>(() =>
    inviteToken ? { status: 'loading' } : { status: 'error', messageKey: 'invite.notFound' }
  )

  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // This flow registers a parent when no account exists, so it needs the same
  // consent gate as Signup. Required up front rather than after the failed
  // login that reveals which path we are on — stopping to ask mid-submit
  // would be worse, and it is also the account-creation path for Google.
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Guards the auto-accept path: without it, every re-render that re-runs the
  // load effect would fire another accept for the same token.
  const autoAcceptTokenRef = useRef<string | null>(null)
  useEffect(() => { autoAcceptTokenRef.current = null }, [inviteToken])

  async function doAccept(invitation: InvitationDetails) {
    setState({ status: 'accepting' })
    try {
      await acceptInvitation(invitation.token)
      clearPendingInviteToken()
      setState({ status: 'success', kidName: invitation.kid_name })
    } catch (err) {
      // Already accepted is the same outcome from the user's point of view.
      if (isInvitationAlreadyAccepted(err)) {
        clearPendingInviteToken()
        setState({ status: 'success', kidName: invitation.kid_name })
        return
      }
      setState({ status: 'error', messageKey: getApiErrorKey(err) })
    }
  }

  // ── Load the invitation, once auth has hydrated ────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    if (!inviteToken) { clearPendingInviteToken(); return }

    let cancelled = false

    getInvitation(inviteToken)
      .then(invitation => {
        if (cancelled) return

        if (invitation.status === 'accepted') {
          clearPendingInviteToken()
          setState({ status: 'success', kidName: invitation.kid_name })
          return
        }

        if (invitation.status !== 'pending') {
          clearPendingInviteToken()
          setState({
            status: 'error',
            messageKey: invitation.status === 'expired' ? 'invite.expired' : 'invite.notPending',
          })
          return
        }

        if (isAuthenticated && currentUser?.role === 'parent') {
          if (!emailsMatchIgnoreCase(currentUser.email, invitation.invite_email)) {
            // Keep the token so they can retry after switching accounts.
            savePendingInviteToken(inviteToken)
            setState({ status: 'wrong_account', invitation, loggedInEmail: currentUser.email! })
          } else if (autoAcceptTokenRef.current !== inviteToken) {
            autoAcceptTokenRef.current = inviteToken
            void doAccept(invitation)
          } else {
            setState(prev =>
              prev.status === 'accepting' || prev.status === 'success' ? prev : { status: 'accepting' }
            )
          }
        } else if (isAuthenticated && currentUser?.role === 'kid') {
          clearPendingInviteToken()
          setState({ status: 'error', messageKey: 'invite.parentOnly' })
        } else {
          savePendingInviteToken(inviteToken)
          setState(prev =>
            prev.status === 'verify_email' || prev.status === 'accepting'
              ? prev
              : { status: 'form', invitation }
          )
          if (invitation.invited_username_hint) {
            setUsername(prev => prev || invitation.invited_username_hint)
          }
        }
      })
      .catch(() => {
        if (cancelled) return
        clearPendingInviteToken()
        setState({ status: 'error', messageKey: 'invite.notFound' })
      })

    return () => { cancelled = true }
    // `t` is intentionally absent: a language change must not re-fetch, and
    // re-fetching would also re-trigger the auto-accept path.
  }, [hydrated, inviteToken, isAuthenticated, currentUser?.email, currentUser?.role])

  // ── Password path: log in if the account exists, otherwise register ────────
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state.status !== 'form') return

    setFormErrorKey(null)
    const errs: Record<string, string> = {}
    // After registering, the parent returns via the emailed link and only
    // needs their password — the username is already taken by their account.
    if (!wasPendingInviteRegistered() && isEmpty(username)) errs.username = t('errors.required')
    if (!agreedToTerms) errs.agreedToTerms = t('errors.mustAgreeToTerms')
    const passwordError = validatePasswordField(password, t, {
      username,
      email: state.invitation.invite_email,
    })
    if (passwordError) errs.password = passwordError
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    resetFieldErrors()
    setIsSubmitting(true)
    const { invitation } = state

    try {
      const tokens = await loginParent(invitation.invite_email, password)
      establishParentSession(tokens)
      await doAccept(invitation)
    } catch (err) {
      if (isAccountNotFound(err)) {
        try {
          await registerParent(invitation.invite_email, username, password)
          markPendingInviteRegistered()
          setState({ status: 'verify_email', email: invitation.invite_email })
        } catch (registerErr) {
          const fields = getFieldErrors(registerErr)
          if (Object.keys(fields).length > 0) { setFieldErrors(fields); return }
          setFormErrorKey(getApiErrorKey(registerErr))
        }
      } else if (isEmailNotVerified(err)) {
        setState({ status: 'verify_email', email: invitation.invite_email })
      } else {
        setFormErrorKey(getApiErrorKey(err))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Google path: the account must match the invited address ───────────────
  async function acceptWithGoogle(invitation: InvitationDetails, credential: string) {
    setFormErrorKey(null)
    resetFieldErrors()
    if (!agreedToTerms) {
      setFieldErrors({ agreedToTerms: t('errors.mustAgreeToTerms') })
      return
    }
    setIsSubmitting(true)

    try {
      // Signup endpoint: creates a parent if new, or returns tokens if they
      // already have an account (login-only would reject first-time invitees).
      const tokens = await signupParentWithGoogle(credential)
      const user = parentUserFromAccessToken(tokens.access)

      if (!emailsMatchIgnoreCase(user.email, invitation.invite_email)) {
        establishParentSession(tokens)
        savePendingInviteToken(invitation.token)
        setState({ status: 'wrong_account', invitation, loggedInEmail: user.email! })
        return
      }

      establishParentSession(tokens)
      await doAccept(invitation)
    } catch (err) {
      setFormErrorKey(getApiErrorKey(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Signing out of the wrong account drops straight back to the sign-in form
   * for this invitation, rather than a reload that would re-fetch it.
   */
  function showFormFor(invitation: InvitationDetails) {
    setState({ status: 'form', invitation })
  }

  return {
    state, hydrated, inviteToken, showFormFor,
    password, setPassword,
    username, setUsername,
    agreedToTerms, setAgreedToTerms,
    formErrorKey, setFormErrorKey,
    fieldErrors, clearFieldError, resetFieldErrors,
    isSubmitting,
    submit, acceptWithGoogle,
  }
}
