import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from '../components/AuthMessageLayout'
import GoogleSignInSection from '../components/GoogleSignInSection'
import Button from '../components/Button'
import FormField from '../components/FormField'
import TermsCheckbox from '../components/TermsCheckbox'
import FormAlert from '../components/FormAlert'
import useAuthStore from '../store/authStore'
import { acceptInvitePath, wasPendingInviteRegistered } from '../utils/inviteToken'
import { usePageTitle } from '../hooks/usePageTitle'
import { useInviteAcceptance } from '../hooks/useInviteAcceptance'

export default function AcceptInvite() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle(t('invite.title'))
  const { isAuthenticated, currentUser, logout } = useAuthStore()

  const {
    state, hydrated, inviteToken, showFormFor,
    password, setPassword,
    username, setUsername,
    agreedToTerms, setAgreedToTerms,
    formErrorKey, setFormErrorKey,
    fieldErrors, clearFieldError, resetFieldErrors,
    isSubmitting,
    submit, acceptWithGoogle,
  } = useInviteAcceptance()

  // Move focus to the heading on every transition so a screen reader
  // announces the new content instead of leaving the user on stale text.
  useEffect(() => {
    document.getElementById('invite-heading')?.focus()
  }, [state.status])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!hydrated || state.status === 'loading') {
    return (
      <AuthMessageLayout
        headingId="invite-heading"
        title={t('invite.loading')}
        statusMessage={t('invite.loading')}
      />
    )
  }

  if (state.status === 'error') {
    return (
      <AuthMessageLayout
        headingId="invite-heading"
        icon="❌"
        title={t('invite.errorTitle')}
        alertMessage={t(state.messageKey)}
        statusMessage={t(state.messageKey)}
      >
        {isAuthenticated && currentUser?.role === 'kid' ? (
          <Button
            variant="primary"
            onClick={() => {
              logout()
              navigate(acceptInvitePath(inviteToken!))
            }}
          >
            {t('nav.logout')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate('/')}>
            {t('auth.backToHome')}
          </Button>
        )}
      </AuthMessageLayout>
    )
  }

  if (state.status === 'verify_email') {
    return (
      <AuthMessageLayout
        headingId="invite-heading"
        icon="📬"
        title={t('auth.verifyYourEmail')}
        // Announced as well as focused: the invite form is swapped for a status
        // screen, and without this a screen reader learns only that focus
        // moved, not that the page changed under it.
        statusMessage={t('auth.verifyYourEmail')}
      >
        <p className="font-body text-sm text-gray-700 text-center w-full">
          {t('invite.verifyThenReturn', { email: state.email })}
        </p>
        {inviteToken && (
          <Button
            variant="primary"
            onClick={() => navigate(acceptInvitePath(inviteToken))}
          >
            {t('invite.returnToInvite')}
          </Button>
        )}
      </AuthMessageLayout>
    )
  }

  if (state.status === 'form') {
    return (
      <AuthMessageLayout headingId="invite-heading" icon="👋" title={t('invite.title')}>
        <p className="font-body text-sm text-gray-700 text-center w-full">
          {t('invite.subtitle', { name: state.invitation.kid_name })}
        </p>
        <p className="font-body text-xs text-gray-500 text-center w-full">
          {t('invite.invitedAs', { email: state.invitation.invite_email })}
        </p>

        <form
          noValidate
          className="flex w-full flex-col gap-4"
          onSubmit={submit}
          aria-labelledby="invite-heading"
          aria-busy={isSubmitting}
        >
          {formErrorKey && <FormAlert message={t(formErrorKey)} />}

          {!wasPendingInviteRegistered() && (
            <FormField
              id="username"
              label={t('auth.username')}
              type="text"
              dir="ltr"
              value={username}
              required
              autoComplete="username"
              disabled={isSubmitting}
              error={fieldErrors.username}
              onChange={e => { setUsername(e.target.value); clearFieldError('username') }}
            />
          )}

          <FormField
            id="password"
            label={t('auth.password')}
            type="password"
            value={password}
            required
            autoComplete={wasPendingInviteRegistered() ? 'current-password' : 'new-password'}
            disabled={isSubmitting}
            error={fieldErrors.password}
            onChange={e => { setPassword(e.target.value); clearFieldError('password') }}
          />

          {/* This form registers the parent when no account exists yet, so it
              needs the same consent gate the signup page has. */}
          <TermsCheckbox
            checked={agreedToTerms}
            onChange={v => { setAgreedToTerms(v); clearFieldError('agreedToTerms') }}
            disabled={isSubmitting}
            error={fieldErrors.agreedToTerms}
            errorId="invite-terms-error"
          />

          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t('invite.accepting')
              : wasPendingInviteRegistered() ? t('invite.loginToAccept') : t('invite.accept')}
          </Button>
        </form>

        <GoogleSignInSection
          disabled={isSubmitting}
          onSuccess={credential => acceptWithGoogle(state.invitation, credential)}
          onError={() => { resetFieldErrors(); setFormErrorKey('errors.api.invalidGoogleToken') }}
          hint={t('invite.googleEmailHint', { email: state.invitation.invite_email })}
        />
      </AuthMessageLayout>
    )
  }

  if (state.status === 'wrong_account') {
    return (
      <AuthMessageLayout
        headingId="invite-heading"
        icon="⚠️"
        // Its own title rather than the generic "You've been invited!": a
        // warning icon under a celebratory heading reads as success, and this
        // state needs the person to act — they are signed in as someone else.
        title={t('invite.wrongAccountTitle')}
        // As an alert, not body text: it is the reason the invitation cannot
        // proceed, and it was previously neither announced nor focused.
        alertMessage={t('invite.wrongAccount', {
          email: state.loggedInEmail,
          inviteEmail: state.invitation.invite_email,
        })}
      >
        <Button
          variant="secondary"
          onClick={() => {
            logout()
            if (state.invitation.status === 'pending') {
              showFormFor(state.invitation)
            } else {
              navigate(acceptInvitePath(state.invitation.token))
            }
          }}
        >
          {t('nav.logout')}
        </Button>
      </AuthMessageLayout>
    )
  }

  if (state.status === 'accepting') {
    return (
      <AuthMessageLayout
        headingId="invite-heading"
        title={t('invite.accepting')}
        statusMessage={t('invite.accepting')}
      >
        <Button variant="secondary" onClick={() => navigate('/')}>
          {t('auth.backToHome')}
        </Button>
      </AuthMessageLayout>
    )
  }

  if (state.status === 'success') {
    const loggedInParent = isAuthenticated && currentUser?.role === 'parent'
    return (
      <AuthMessageLayout
        headingId="invite-heading"
        icon="🎉"
        title={t('invite.successTitle')}
        statusMessage={t('invite.successTitle')}
      >
        <p className="font-body text-sm text-gray-700 text-center w-full">
          {t('invite.successHint', { name: state.kidName })}
        </p>
        <Button
          variant="primary"
          onClick={() => navigate(loggedInParent ? '/parent/dashboard' : '/login')}
        >
          {loggedInParent ? t('invite.goToDashboard') : t('auth.login')}
        </Button>
      </AuthMessageLayout>
    )
  }

  return null
}
