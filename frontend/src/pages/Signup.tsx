import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import LanguageSwitcher from '../components/LanguageSwitcher'
import Button from '../components/Button'
import Input from '../components/Input'
import useAuthStore from '../store/authStore'
import { registerParent, loginParent, signupKid, decodeJWT, parseApiError, type KidSignupResponse } from '../api/auth'

export default function Signup() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const login = useAuthStore(state => state.login)

  const [role, setRole] = useState<'parent' | 'kid' | null>(null)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // After kid signup: show the "waiting for parent" screen
  // We store the kid's info so we can show their parent_email in the message
  const [kidPending, setKidPending] = useState<KidSignupResponse | null>(null)
  const [kidParentEmail, setKidParentEmail] = useState('')

  useEffect(() => {
    if (role !== null) {
      document.getElementById('username')?.focus()
    }
  }, [role])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return

    setError(null)
    setIsLoading(true)

    try {
      if (role === 'parent') {
        // 1. Create the parent account
        await registerParent(email, username, password)
        // 2. Auto-login so they don't have to log in manually right after signing up
        const { access, refresh } = await loginParent(email, password)
        const payload = decodeJWT(access)

        login(
          {
            id: payload.user_id as string,
            username: payload.username as string,
            email: payload.email as string,
            role: 'parent',
          },
          access,
          refresh,
        )
        navigate('/parent/dashboard')
      } else {
        // Kid signup — kid can't log in until a parent accepts the email invite
        const result = await signupKid(name, username, password, parentEmail)
        // Save parent email so we can show it on the waiting screen
        setKidParentEmail(parentEmail)
        setKidPending(result)
      }
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── "Waiting for parent" screen ────────────────────────────────────────────
  // Shown after a successful kid signup. The kid can't log in yet —
  // they have to wait for the parent to accept the invite email.
  if (kidPending) {
    return (
      <main aria-labelledby="waiting-heading" className="flex flex-col items-center justify-center min-h-screen bg-primary-50 gap-6 py-12">
        <div className="text-5xl" aria-hidden="true">📬</div>
        <h1 id="waiting-heading" className="font-heading text-3xl font-bold text-primary-700 text-center">
          {t('auth.waitingForParent')}
        </h1>
        <p className="font-body text-sm text-gray-700 text-center w-80 max-w-full">
          {t('auth.waitingForParentHint', { email: kidParentEmail })}
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          {t('auth.backToHome')}
        </Button>
        <LanguageSwitcher />
      </main>
    )
  }

  // ── Signup form ────────────────────────────────────────────────────────────
  return (
    <main aria-labelledby="signup-heading" className="flex flex-col items-center justify-center min-h-screen bg-primary-50 gap-6 py-12">
      <h1 id="signup-heading" className="font-heading text-3xl font-bold text-primary-700 text-center">
        {t('auth.signup')}
      </h1>

      <fieldset
        aria-labelledby="role-selector-label"
        className="flex w-80 max-w-full flex-col items-center gap-4 border-0 p-0 m-0 min-w-0"
      >
        <p
          id="role-selector-label"
          className="font-body text-sm font-semibold text-gray-700 text-center w-full m-0"
        >
          {t('auth.roleSelector')}
        </p>
        <div role="radiogroup" aria-required="true" className="flex gap-4">
          <Button
            role="radio"
            variant={role === 'parent' ? 'primary' : 'secondary'}
            onClick={() => setRole('parent')}
            aria-checked={role === 'parent'}
          >
            {t('auth.parent')}
          </Button>
          <Button
            role="radio"
            variant={role === 'kid' ? 'primary' : 'secondary'}
            onClick={() => setRole('kid')}
            aria-checked={role === 'kid'}
          >
            {t('auth.child')}
          </Button>
        </div>
      </fieldset>

      {role !== null && (
        <>
          <p className="sr-only" aria-live="polite" role="status">
            {t('a11y.signupFormReady')}
          </p>
          <form
            className="flex w-80 max-w-full flex-col gap-4"
            onSubmit={handleSubmit}
            aria-labelledby="signup-heading"
          >
            {/* Error message from the API */}
            {error && (
              <p role="alert" className="font-body text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="font-body text-sm font-semibold text-gray-700">
                {t('auth.username')}
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                required
                autoComplete="username"
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            {role === 'kid' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="name" className="font-body text-sm font-semibold text-gray-700">
                  {t('auth.name')}
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  required
                  autoComplete="name"
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}

            {role === 'parent' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="font-body text-sm font-semibold text-gray-700">
                  {t('auth.email')}
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder={t('auth.emailHint')}
                  required
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="font-body text-sm font-semibold text-gray-700">
                {t('auth.password')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                required
                autoComplete="new-password"
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {role === 'kid' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="parentEmail" className="font-body text-sm font-semibold text-gray-700">
                  {t('auth.parentEmail')}
                </label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={parentEmail}
                  placeholder={t('auth.emailHint')}
                  required
                  autoComplete="off"
                  onChange={e => setParentEmail(e.target.value)}
                />
              </div>
            )}

            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? t('auth.signingUp') : t('auth.signup')}
            </Button>
          </form>
        </>
      )}

      <p className="font-body text-sm text-gray-700 text-center">
        {t('auth.hasAccount')}{' '}
        <Link
          to="/login"
          className="font-semibold text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
          aria-label={t('a11y.goToLogin')}
        >
          {t('nav.login')}
        </Link>
      </p>
      <LanguageSwitcher />
    </main>
  )
}
