import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type TaskCategory, CATEGORY_STYLE } from '../constants/categories'
import { getCategorySettings, updateCategorySettings, type CategorySettings } from '../api/tasks'
import { inviteParent } from '../api/auth'
import { getApiErrorKey } from '../api/errors'
import { useFormErrors } from '../hooks/useFormErrors'
import { isValidEmail, isEmpty } from '../utils/validation'
import FormField from '../components/FormField'
import FormAlert from '../components/FormAlert'
import Button from '../components/Button'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { usePageTitle } from '../hooks/usePageTitle'

// ─── Category → settings key map ─────────────────────────────────────────────

const ROWS: Array<{ category: TaskCategory; key: keyof CategorySettings }> = [
  { category: 'health',         key: 'show_health'         },
  { category: 'learning',       key: 'show_learning'       },
  { category: 'responsibility', key: 'show_responsibility' },
  { category: 'creativity',     key: 'show_creativity'     },
]

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

  const { data: serverSettings } = useQuery({
    queryKey: ['categorySettings'],
    queryFn: getCategorySettings,
  })

  // Local state mirrors server — updated optimistically on each toggle
  const [settings, setSettings] = useState<CategorySettings | null>(null)
  const [savedRecently, setSavedRecently] = useState(false)

  // Sync local state once server data arrives
  useEffect(() => {
    if (serverSettings && !settings) setSettings(serverSettings)
  }, [serverSettings, settings])

  // ── Invite parent ────────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail]       = useState('')
  const [usernameHint, setUsernameHint]     = useState('')
  const [inviteErrorKey, setInviteErrorKey] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading]   = useState(false)
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
    if (!settings) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    save(updated)
  }

  const displaySettings = settings ?? serverSettings

  return (
    <main
      id="main-content"
      aria-labelledby="settings-heading"
      className="flex-1 p-6 max-w-lg mx-auto overflow-auto"
    >
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-5 mb-6">
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-6 left-1/4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <span className="text-4xl shrink-0" aria-hidden="true">⚙️</span>
          <div>
            <h1 id="settings-heading" className="font-heading text-xl font-bold text-white">
              {t('kidDash.settings')}
            </h1>
            <p className="font-body text-sm text-white">{t('kidDash.settingsHint')}</p>
          </div>
        </div>
      </div>

      {/* ── App settings ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
            🌍
          </div>
          <h2 className="font-heading text-base font-bold text-gray-900">
            {t('kidDash.appSettings')}
          </h2>
        </div>

        <div className="px-6 pb-6">
          <span className="font-heading text-sm font-semibold text-gray-700 mb-3 block">
            {t('a11y.languageSwitcher')}
          </span>
          <LanguageSwitcher />

          <div className="border-t border-gray-100 my-5" />

          <div className="flex items-center justify-between mb-1">
            <span className="font-heading text-sm font-semibold text-gray-700">
              {t('kidDash.categoryVisibility')}
            </span>
            <span className="font-body text-xs text-gray-400 h-4" role="status">
              {isPending && t('kidDash.settingsSaving')}
              {savedRecently && !isPending && (
                <>
                  <span aria-hidden="true">✓</span> {t('kidDash.settingsSaved')}
                </>
              )}
            </span>
          </div>
          <p className="font-body text-sm text-gray-400 mb-4">
            {t('kidDash.categoryVisibilityHint')}
          </p>

          {!displaySettings ? (
            <p className="font-body text-sm text-gray-400">{t('tasks.loading')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ROWS.map(({ category, key }) => {
                const style = CATEGORY_STYLE[category]
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center text-base shrink-0`}
                        aria-hidden="true"
                      >
                        {style.icon}
                      </div>
                      <span className={`font-body text-sm font-semibold ${style.text}`}>
                        {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                      </span>
                    </div>
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
        </div>
      </section>

      {/* ── Invite a parent ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl mt-4 overflow-hidden">
        <div className="flex items-start gap-3 px-6 pt-5 pb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-lg shrink-0 mt-0.5" aria-hidden="true">
            👨‍👩‍👧
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-gray-900">
              {t('inviteParent.title')}
            </h2>
            <p className="font-body text-sm text-gray-400 mt-0.5">
              {t('inviteParent.hint')}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          {sentTo ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="text-3xl" aria-hidden="true">📬</div>
              <p className="font-body text-sm font-semibold text-primary-700">
                {t('inviteParent.success', { email: sentTo })}
              </p>
              <p className="font-body text-xs text-gray-400">{t('inviteParent.successHint')}</p>
              <Button variant="secondary" onClick={() => setSentTo(null)}>
                {t('inviteParent.sendAnother')}
              </Button>
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
              <Button variant="primary" type="submit" disabled={inviteLoading}>
                {inviteLoading ? t('inviteParent.sending') : t('inviteParent.submit')}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* ── Legal ─────────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl mt-4 overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
            📄
          </div>
          <h2 className="font-heading text-base font-bold text-gray-900">
            {t('legal.sectionTitle')}
          </h2>
        </div>

        <nav aria-label={t('a11y.legalNav')} className="px-4 pb-4 flex flex-col gap-1">
          <Link
            to="/privacy"
            className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 focus-ring transition-colors"
          >
            <span className="font-body text-sm font-semibold text-gray-700">
              {t('legal.privacy')}
            </span>
            <span aria-hidden="true" className="text-gray-300 text-xl leading-none">›</span>
          </Link>
          <Link
            to="/terms"
            className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 focus-ring transition-colors"
          >
            <span className="font-body text-sm font-semibold text-gray-700">
              {t('legal.terms')}
            </span>
            <span aria-hidden="true" className="text-gray-300 text-xl leading-none">›</span>
          </Link>
        </nav>
      </section>
    </main>
  )
}
