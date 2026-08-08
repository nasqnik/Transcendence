import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getKidAvatar } from '../api/catalog'
import LoadError from '../components/LoadError'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type TaskCategory, CATEGORY_STYLE } from '../constants/categories'
import { getCategorySettings, updateCategorySettings, type CategorySettings } from '../api/tasks'
import { getKidMe, updateKidProfile, MAX_GUARDIANS } from '../api/kidAccount'
import { deleteAccount } from '../api/account'
import { inviteParent } from '../api/auth'
import { getApiErrorKey } from '../api/errors'
import { useFormErrors } from '../hooks/useFormErrors'
import { useKidLevel } from '../hooks/useKidLevel'
import { isValidEmail, isEmpty } from '../utils/validation'
import useAuthStore from '../store/authStore'
import FormField from '../components/FormField'
import FormAlert from '../components/FormAlert'
import Button from '../components/Button'
import FormActions from '../components/FormActions'
import LanguageSwitcher from '../components/LanguageSwitcher'
import KidAccountRow from '../components/kid/KidAccountRow'
import KidEmailRow from '../components/kid/KidEmailRow'
import KidPasswordSection from '../components/kid/KidPasswordSection'
import MyGrownUps from '../components/kid/MyGrownUps'
import Modal from '../components/Modal'
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

// ─── Delete account ───────────────────────────────────────────────────────────

/**
 * A kid deleting their own account.
 *
 * `DELETE /auth/me/` resolves the actor from the token and falls through to a
 * plain `user.delete()` for a kid, so the role-agnostic `deleteAccount` helper
 * works here unchanged — same as `changePassword` and `requestEmailChange`.
 *
 * This is the only route out of a kid account: there is no public endpoint for
 * a parent to remove a kid, and `delete_parent_account` refuses with 409 while
 * the parent is the sole guardian of one. Without this section a kid account
 * could never be erased, and a sole-guardian parent was locked out of deleting
 * their own account too.
 */
function DeleteAccountSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { mutate: destroy, isPending } = useMutation({
    mutationFn: deleteAccount,
    // The token belongs to a user that no longer exists, so every later request
    // would 401. Clearing it locally also wipes the cached tasks and stats.
    onSuccess: () => { logout(); navigate('/') },
    onError: (err) => setError(t(getApiErrorKey(err))),
  })

  return (
    <Section id="danger-heading" icon="⚠️" title={t('parentDash.deleteAccount')}>
      <p className="font-body text-sm text-gray-500 mb-4">{t('parentDash.deleteAccountHint')}</p>
      {/* Solid danger-700, not danger-500: white on the brighter red measures
          3.93:1 and fails AA, while this lands at 7.07:1. Filled rather than a
          red text link — inside a column of ordinary settings rows the link
          read as just another one, and this is the row that can't be undone. */}
      <button
        type="button"
        onClick={() => { setError(null); setConfirming(true) }}
        className="min-h-11 px-4 inline-flex items-center rounded-xl bg-danger-700 font-body text-sm font-semibold text-white hover:opacity-90 focus-ring transition-opacity"
      >
        {t('parentDash.deleteAccount')}
      </button>

      {confirming && (
        // alertdialog, not dialog: this interrupts to confirm a destructive,
        // irreversible act, so the body text is announced with the title
        // rather than waiting for the kid to explore the dialog.
        <Modal
          role="alertdialog"
          onClose={() => { if (!isPending) setConfirming(false) }}
          labelledBy="kid-delete-modal-title"
          describedBy="kid-delete-modal-body"
          cardClassName="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        >
          <h2 id="kid-delete-modal-title" className="font-heading text-lg font-bold text-gray-900">
            {t('parentDash.deleteAccountConfirmTitle')}
          </h2>
          <p id="kid-delete-modal-body" className="font-body text-sm text-gray-600">
            {t('parentDash.deleteAccountConfirmBody')}
          </p>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="min-h-11 font-body font-semibold text-sm px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 focus-ring transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { setError(null); destroy() }}
              disabled={isPending}
              className="min-h-11 font-body font-semibold text-sm px-4 py-2 rounded-xl bg-danger-700 text-white hover:opacity-90 focus-ring transition-opacity disabled:opacity-50"
            >
              {isPending ? t('parentDash.deleteAccountPending') : t('parentDash.deleteAccountConfirm')}
            </button>
          </div>
        </Modal>
      )}
    </Section>
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
      // The track stays 24px by design; the ::before extends the touch target
      // to 44px without changing how the switch looks or shifting the row.
      className={`relative before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-[''] inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-ring disabled:opacity-50 ${
        checked ? 'bg-primary-500' : 'bg-gray-200'
      }`}
    >
      {/* Positioned with the logical `start-*`, not `translate-x-*`. A
          translate is a physical transform that Tailwind does not mirror, so
          in Arabic the knob slid right — out of a track whose start edge is
          now on the right — and sat detached beside it. */}
      <span
        className={`absolute h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? 'start-6' : 'start-1'
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
  const { level, isLoading: levelLoading, isError: levelError } = useKidLevel()

  const profileQuery = useQuery({
    queryKey: ['kidMe'],
    queryFn: getKidMe,
  })
  const { data: profile, isLoading: profileLoading } = profileQuery

  const settingsQuery = useQuery({
    queryKey: ['categorySettings'],
    queryFn: getCategorySettings,
  })
  const { data: serverSettings } = settingsQuery

  // Optimistic override applied on each toggle; null until the user changes
  // something, at which point it takes over from the server copy.
  const [settings, setSettings] = useState<CategorySettings | null>(null)
  const [savedRecently, setSavedRecently] = useState(false)
  // Cleared on unmount: navigating away inside the two-second window left a
  // timer writing to a component that no longer existed.
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])

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
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSavedRecently(false), 2000)
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

  const { data: avatar } = useQuery({ queryKey: ['kidAvatar'], queryFn: getKidAvatar })

  const displaySettings = settings ?? serverSettings
  // `?? []` rather than trusting the field: an auth-service that predates the
  // `parents` work omits it entirely, and `.length` on undefined would take
  // the whole settings page down instead of degrading to "no guardians yet".
  const parents = profile?.parents ?? []
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
        {/* The character, same as the topbar and the dashboard band, off the
            same cached query. This card kept showing a bare initial after
            those two were wired up, so the kid's face was their identity
            everywhere except the page actually headed "your account". */}
        <div
          className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center font-heading font-bold text-2xl text-primary-700 shrink-0 overflow-hidden"
          aria-hidden="true"
        >
          {avatar?.avatar_url
            ? <img src={avatar.avatar_url} alt="" className="w-full h-full object-cover" />
            : initial}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold text-gray-900 truncate">{displayName}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
              <span aria-hidden="true">🧒</span> {t('auth.child')}
            </span>
            {/* Hidden on failure, not shown as zero: `level` falls back to 0,
                so a failed fetch used to award the kid "Level 0" — the same
                claim-from-nothing the progress band already bans. */}
            {!levelLoading && !levelError && (
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
            {/* The error branch has to come first: the skeleton condition is
                `!profile`, which a failed fetch also satisfies — so without
                this the card shimmered forever, with no error and no way to
                retry. */}
            {profileQuery.isError ? (
              <LoadError variant="inline" onRetry={() => profileQuery.refetch()} />
            ) : profileLoading || !profile ? (
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
                  dir="ltr"
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

          {/* Last in the account column, under the things it undoes. */}
          <DeleteAccountSection />
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

            {/* Error before loading: `!displaySettings` is also true when the
                fetch failed, so without this branch the panel showed the
                loading string forever — the same trap the account card had. */}
            {settingsQuery.isError ? (
              <LoadError variant="inline" onRetry={() => settingsQuery.refetch()} />
            ) : !displaySettings ? (
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

          {/* ── My grown-ups ─────────────────────────────────────────────────────── */}
          {profile && (
            <Section id="grownups-heading" icon="👨‍👩‍👧" title={t('grownUps.title')}>
              <p className="font-body text-sm text-gray-500 mb-3">{t('grownUps.intro')}</p>
              <MyGrownUps parents={parents} />
            </Section>
          )}

          {/* ── Invite a parent ───────────────────────────────────────────────────── */}
          {/* Hidden once the kid already has both guardians. The form used to be
              always visible, so a kid at the limit could fill it in and submit,
              and only then learn from the error that there was never a slot. */}
          {profile && parents.length < MAX_GUARDIANS && (
          <Section id="invite-heading" icon="✉️" title={t('inviteParent.title')}>
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
                  className="shrink-0 min-h-11 -my-2 px-2 inline-flex items-center font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
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
                <FormActions
                  submitLabel={t('inviteParent.submit')}
                  pendingLabel={t('inviteParent.sending')}
                  busy={inviteLoading}
                  onCancel={() => { setInviteOpen(false); resetFieldErrors(); setInviteErrorKey(null) }}
                />
              </form>
            )}
          </Section>
          )}
        </div>

      </div>


    </main>
  )
}
