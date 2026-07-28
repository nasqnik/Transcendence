import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type TaskCategory, CATEGORY_STYLE } from '../constants/categories'
import { getCategorySettings, updateCategorySettings, type CategorySettings } from '../api/tasks'
import { getKidMe, updateKidProfile } from '../api/kidAccount'
import { inviteParent } from '../api/auth'
import { getApiErrorKey } from '../api/errors'
import { useFormErrors } from '../hooks/useFormErrors'
import { useKidLevel } from '../hooks/useKidLevel'
import { isValidEmail, isEmpty } from '../utils/validation'
import useAuthStore from '../store/authStore'
import FormField from '../components/FormField'
import FormAlert from '../components/FormAlert'
import Button from '../components/Button'
import LanguageSwitcher from '../components/LanguageSwitcher'
import KidAccountRow from '../components/kid/KidAccountRow'
import KidEmailRow from '../components/kid/KidEmailRow'
import KidPasswordSection from '../components/kid/KidPasswordSection'
import { usePageTitle } from '../hooks/usePageTitle'

// ─── Category → settings key map ─────────────────────────────────────────────

const ROWS: Array<{ category: TaskCategory; key: keyof CategorySettings }> = [
  { category: 'health',         key: 'show_health'         },
  { category: 'learning',       key: 'show_learning'       },
  { category: 'responsibility', key: 'show_responsibility' },
  { category: 'creativity',     key: 'show_creativity'     },
]

// ─── Section shell ────────────────────────────────────────────────────────────

interface SectionProps {
  id: string
  icon: string
  title: string
  children: React.ReactNode
}

/** White card with an emoji + heading, matching the parent settings layout. */
function Section({ id, icon, title, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="bg-white rounded-2xl p-6">
      <h2 id={id} className="font-heading text-lg font-bold text-gray-900 mb-4">
        <span aria-hidden="true">{icon}</span> {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}

function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-ring disabled:opacity-50 ${
        checked ? 'bg-primary-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KidSettings() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  usePageTitle(t('kidDash.settings'))

  const currentUser = useAuthStore(s => s.currentUser)
  const updateUser = useAuthStore(s => s.updateUser)
  const { level, isLoading: levelLoading } = useKidLevel()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['kidMe'],
    queryFn: getKidMe,
  })

  const { data: serverSettings } = useQuery({
    queryKey: ['categorySettings'],
    queryFn: getCategorySettings,
  })

  // Optimistic override applied on each toggle; null until the user changes
  // something, at which point it takes over from the server copy.
  const [settings, setSettings] = useState<CategorySettings | null>(null)
  const [savedRecently, setSavedRecently] = useState(false)

  // ── Invite parent ────────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail]       = useState('')
  const [usernameHint, setUsernameHint]     = useState('')
  const [inviteErrorKey, setInviteErrorKey] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading]   = useState(false)
  const [inviteOpen, setInviteOpen]         = useState(false)
  const [sentTo, setSentTo]                 = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteErrorKey(null)
    const errs: Record<string, string> = {}
    if (isEmpty(inviteEmail))            errs.email = t('errors.required')
    else if (!isValidEmail(inviteEmail)) errs.email = t('errors.invalidEmail')
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    resetFieldErrors()
    setInviteLoading(true)
    try {
      await inviteParent(inviteEmail, usernameHint || undefined)
      setSentTo(inviteEmail)
      setInviteEmail('')
      setUsernameHint('')
    } catch (err) {
      setInviteErrorKey(getApiErrorKey(err))
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Category visibility ───────────────────────────────────────────────────────
  const { mutate: save, isPending, isError } = useMutation({
    mutationFn: updateCategorySettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['categorySettings'], updated)
      setSavedRecently(true)
      setTimeout(() => setSavedRecently(false), 2000)
    },
    onError: () => {
      // Revert to last known server state on failure
      if (serverSettings) setSettings(serverSettings)
    },
  })

  function handleToggle(key: keyof CategorySettings, value: boolean) {
    const base = settings ?? serverSettings
    if (!base) return
    const updated = { ...base, [key]: value }
    setSettings(updated)
    save(updated)
  }

  const displaySettings = settings ?? serverSettings
  const displayName = profile?.name || profile?.username || currentUser?.username
  const initial = displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <main
      id="main-content"
      aria-labelledby="settings-heading"
      className="flex-1 w-full flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="settings-heading" className="sr-only">{t('kidDash.settings')}</h1>

      {/* ── Identity ──────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl p-6 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center font-heading font-bold text-2xl text-primary-700 shrink-0"
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold text-gray-900 truncate">{displayName}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
              <span aria-hidden="true">🧒</span> {t('auth.child')}
            </span>
            {!levelLoading && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
                <span aria-hidden="true">⭐</span> {t('kidDash.level', { level })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Account chores on the left, everything else on the right. The
          identity card above spans the full width. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">

        <div className="flex flex-col gap-4 sm:gap-6">
          {/* ── Account details ───────────────────────────────────────────────────── */}
          <Section id="account-heading" icon="👤" title={t('parentDash.accountDetails')}>
            {profileLoading || !profile ? (
              <div className="flex flex-col gap-3 py-2">
                <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                <KidAccountRow
                  id="kid-name"
                  label={t('auth.name')}
                  value={profile.name}
                  fieldKey="name"
                  autoComplete="name"
                  save={(name) => updateKidProfile({ name })}
                />
                <KidAccountRow
                  id="kid-username"
                  label={t('auth.username')}
                  value={profile.username}
                  fieldKey="username"
                  autoComplete="username"
                  save={(username) => updateKidProfile({ username })}
                  onSaved={(username) => updateUser({ username })}
                />
                <KidEmailRow
                  email={profile.email}
                  pendingEmail={profile.pending_email}
                  emailVerified={profile.email_verified}
                />
              </div>
            )}
          </Section>

          {/* ── Security ──────────────────────────────────────────────────────────── */}
          {profile && (
            <Section id="security-heading" icon="🔒" title={t('parentDash.security')}>
              <KidPasswordSection hasPassword={profile.has_password} />
            </Section>
          )}

          {/* ── Preferences ─────────────────────────────────────────────────────── */}
          <Section id="prefs-heading" icon="🌍" title={t('parentDash.preferences')}>
            <div className="flex items-center justify-between gap-4">
              <span className="font-body text-sm text-gray-500">{t('parentDash.language')}</span>
              <LanguageSwitcher />
            </div>
          </Section>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6">
          {/* ── Category visibility ───────────────────────────────────────────────── */}
          <Section id="categories-heading" icon="🎯" title={t('kidDash.categoryVisibility')}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-body text-sm text-gray-500">{t('kidDash.categoryVisibilityHint')}</p>
              <span className="font-body text-xs text-gray-400 h-4 shrink-0 ms-3" role="status">
                {isPending && t('kidDash.settingsSaving')}
                {savedRecently && !isPending && (
                  <>
                    <span aria-hidden="true">✓</span> {t('kidDash.settingsSaved')}
                  </>
                )}
              </span>
            </div>

            {!displaySettings ? (
              <p className="font-body text-sm text-gray-400 mt-4">{t('tasks.loading')}</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100 mt-2">
                {ROWS.map(({ category, key }) => {
                  const style = CATEGORY_STYLE[category]
                  return (
                    <div key={category} className="flex items-center justify-between gap-4 py-3">
                      <span className="flex items-center gap-2 font-body text-sm font-semibold text-gray-700">
                        <span aria-hidden="true">{style.icon}</span>
                        {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                      </span>
                      <Toggle
                        checked={displaySettings[key]}
                        onChange={value => handleToggle(key, value)}
                        label={t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                        disabled={isPending}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {isError && (
              <p role="alert" className="font-body text-sm text-danger-700 mt-4">
                {t('errors.generic')}
              </p>
            )}
          </Section>

          {/* ── Invite a parent ───────────────────────────────────────────────────── */}
          <Section id="invite-heading" icon="👨‍👩‍👧" title={t('inviteParent.title')}>
            {sentTo ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="text-3xl" aria-hidden="true">📬</div>
                <p className="font-body text-sm font-semibold text-primary-700">
                  {t('inviteParent.success', { email: sentTo })}
                </p>
                <p className="font-body text-xs text-gray-400">{t('inviteParent.successHint')}</p>
                <Button variant="secondary" onClick={() => { setSentTo(null); setInviteOpen(true) }}>
                  {t('inviteParent.sendAnother')}
                </Button>
              </div>
            ) : !inviteOpen ? (
              // Collapsed until asked for, like the password section: inviting
              // a second guardian is a one-off, not something to keep a form
              // open for.
              <div className="flex items-center justify-between gap-4">
                <p className="font-body text-sm text-gray-500">{t('inviteParent.hint')}</p>
                <button
                  type="button"
                  onClick={() => { resetFieldErrors(); setInviteErrorKey(null); setInviteOpen(true) }}
                  className="shrink-0 font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
                >
                  {t('kidDash.inviteNow')}
                </button>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={handleInvite}
                className="flex flex-col gap-3"
                aria-label={t('inviteParent.title')}
                aria-busy={inviteLoading}
              >
                {inviteErrorKey && <FormAlert message={t(inviteErrorKey)} />}
                <FormField
                  id="invite-email"
                  label={t('inviteParent.email')}
                  type="email"
                  value={inviteEmail}
                  required
                  autoComplete="off"
                  disabled={inviteLoading}
                  error={fieldErrors.email}
                  onChange={e => { setInviteEmail(e.target.value); clearFieldError('email') }}
                />
                <FormField
                  id="invite-username-hint"
                  label={t('inviteParent.usernameHint')}
                  type="text"
                  dir="ltr"
                  value={usernameHint}
                  autoComplete="off"
                  disabled={inviteLoading}
                  onChange={e => setUsernameHint(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="primary" type="submit" disabled={inviteLoading} className="px-4 py-2 text-sm">
                    {inviteLoading ? t('inviteParent.sending') : t('inviteParent.submit')}
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => { setInviteOpen(false); resetFieldErrors(); setInviteErrorKey(null) }}
                    disabled={inviteLoading}
                    className="px-4 py-2 text-sm"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            )}
          </Section>
        </div>

      </div>

    </main>
  )
}
