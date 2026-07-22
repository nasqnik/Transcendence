import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { kidsFromToken } from '../api/parent'
import {
  getMe, updateUsername, changePassword, requestEmailChange, type MeProfile,
} from '../api/account'
import { getFieldErrors } from '../api/errors'
import { usePageTitle } from '../hooks/usePageTitle'
import { useFormErrors } from '../hooks/useFormErrors'
import FormField from '../components/FormField'
import Button from '../components/Button'
import LanguageSwitcher from '../components/LanguageSwitcher'

// Username 

function UsernameRow({ profile }: { profile: MeProfile }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const updateUser = useAuthStore(s => s.updateUser)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(profile.username)
  const [saved, setSaved] = useState(false)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateUsername(value.trim()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['me'] })
      updateUser({ username: data.username })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (err) => setFieldErrors(getFieldErrors(err)),
  })

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="font-body text-sm text-gray-500">{t('auth.username')}</p>
          <p className="font-body text-sm font-semibold text-gray-900 truncate">{profile.username}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saved && <span className="font-body text-xs text-teal-700">{t('kidDash.settingsSaved')}</span>}
          <button
            type="button"
            onClick={() => { setValue(profile.username); resetFieldErrors(); setEditing(true) }}
            className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('tasks.editBtn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); resetFieldErrors(); mutate() }} className="py-3 flex flex-col gap-3">
      <FormField
        id="username"
        label={t('auth.username')}
        value={value}
        onChange={(e) => { setValue(e.target.value); clearFieldError('username') }}
        error={fieldErrors.username}
        autoComplete="username"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={isPending} className="px-4 py-2 text-sm">
          {isPending ? t('kidDash.settingsSaving') : t('tasks.saveTask')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={isPending} className="px-4 py-2 text-sm">
          {t('parentDash.cancel')}
        </Button>
      </div>
    </form>
  )
}

// Email

function EmailRow({ profile }: { profile: MeProfile }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const { mutate, isPending } = useMutation({
    mutationFn: () => requestEmailChange(value.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      setSentTo(value.trim())
      setEditing(false)
      setValue('')
    },
    onError: (err) => setFieldErrors(getFieldErrors(err)),
  })

  return (
    <div className="py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body text-sm text-gray-500">{t('auth.email')}</p>
          <p className="font-body text-sm font-semibold text-gray-900 truncate">
            {profile.email}
            {profile.email_verified && (
              <span className="ms-2 font-body text-xs font-semibold text-teal-700">✓ {t('parentDash.verified')}</span>
            )}
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => { setValue(''); resetFieldErrors(); setSentTo(null); setEditing(true) }}
            className="shrink-0 font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('parentDash.changeEmail')}
          </button>
        )}
      </div>

      {profile.pending_email && (
        <p className="font-body text-xs text-amber-700">
          {t('parentDash.emailPending', { email: profile.pending_email })}
        </p>
      )}

      {sentTo && (
        <p className="font-body text-xs text-teal-700">{t('parentDash.emailChangeSent', { email: sentTo })}</p>
      )}

      {editing && (
        <form onSubmit={(e) => { e.preventDefault(); resetFieldErrors(); mutate() }} className="flex flex-col gap-3">
          <FormField
            id="new-email"
            label={t('parentDash.newEmail')}
            type="email"
            value={value}
            onChange={(e) => { setValue(e.target.value); clearFieldError('email') }}
            error={fieldErrors.email}
            autoComplete="email"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isPending} className="px-4 py-2 text-sm">
              {isPending ? t('kidDash.settingsSaving') : t('tasks.saveTask')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={isPending} className="px-4 py-2 text-sm">
              {t('parentDash.cancel')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

// Password

function PasswordSection({ profile }: { profile: MeProfile }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const { mutate, isPending } = useMutation({
    mutationFn: () => changePassword({
      ...(profile.has_password ? { current_password: current } : {}),
      new_password: next,
    }),
    onSuccess: () => {
      setDone(true)
      setOpen(false)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setDone(false), 2500)
    },
    onError: (err) => setFieldErrors(getFieldErrors(err)),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    resetFieldErrors()
    if (next !== confirm) {
      setFieldErrors({ confirm: t('parentDash.passwordMismatch') })
      return
    }
    mutate()
  }

  const heading = profile.has_password ? t('parentDash.changePassword') : t('parentDash.setPassword')

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="font-body text-sm font-semibold text-gray-700">{heading}</p>
        <div className="flex items-center gap-3">
          {done && <span className="font-body text-xs text-teal-700">{t('parentDash.passwordChanged')}</span>}
          <button
            type="button"
            onClick={() => { resetFieldErrors(); setOpen(true) }}
            className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('tasks.editBtn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="font-body text-sm font-semibold text-gray-700">{heading}</p>
      {profile.has_password && (
        <FormField
          id="current-password"
          label={t('parentDash.currentPassword')}
          type="password"
          value={current}
          onChange={(e) => { setCurrent(e.target.value); clearFieldError('current_password') }}
          error={fieldErrors.current_password}
          autoComplete="current-password"
        />
      )}
      <FormField
        id="new-password"
        label={t('parentDash.newPassword')}
        type="password"
        value={next}
        onChange={(e) => { setNext(e.target.value); clearFieldError('new_password') }}
        error={fieldErrors.new_password}
        autoComplete="new-password"
      />
      <FormField
        id="confirm-password"
        label={t('parentDash.confirmPassword')}
        type="password"
        value={confirm}
        onChange={(e) => { setConfirm(e.target.value); clearFieldError('confirm') }}
        error={fieldErrors.confirm}
        autoComplete="new-password"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={isPending} className="px-4 py-2 text-sm">
          {isPending ? t('kidDash.settingsSaving') : t('tasks.saveTask')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isPending} className="px-4 py-2 text-sm">
          {t('parentDash.cancel')}
        </Button>
      </div>
    </form>
  )
}

// Page

export default function ParentSettings() {
  const { t } = useTranslation()
  usePageTitle(t('parentDash.settings'))

  const { currentUser, token } = useAuthStore()
  const kids = token ? kidsFromToken(token) : []
  const { data: profile, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe })

  const displayName = profile?.username ?? currentUser?.username
  const initial = displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <main
      id="main-content"
      aria-labelledby="settings-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="settings-heading" className="sr-only">{t('parentDash.settings')}</h1>

      {/* Identity */}
      <section className="bg-white rounded-2xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center font-heading font-bold text-2xl text-primary-700 shrink-0" aria-hidden="true">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold text-gray-900 truncate">{displayName}</p>
          <span className="inline-flex items-center mt-1 bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
            {t('auth.parent')}
          </span>
        </div>
      </section>

      {/* Account */}
      <section aria-labelledby="account-heading" className="bg-white rounded-2xl p-6">
        <h2 id="account-heading" className="font-heading text-lg font-bold text-gray-900 mb-2">
          {t('parentDash.accountDetails')}
        </h2>
        {isLoading || !profile ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            <UsernameRow profile={profile} />
            <EmailRow profile={profile} />
            <div className="flex items-center justify-between gap-4 py-3">
              <p className="font-body text-sm text-gray-500">{t('parentDash.linkedChildren')}</p>
              <p className="font-body text-sm font-semibold text-gray-900">{kids.length}</p>
            </div>
          </div>
        )}
      </section>

      {/* Security */}
      {profile && (
        <section aria-labelledby="security-heading" className="bg-white rounded-2xl p-6">
          <h2 id="security-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
            {t('parentDash.security')}
          </h2>
          <PasswordSection profile={profile} />
        </section>
      )}

      {/* Preferences */}
      <section aria-labelledby="prefs-heading" className="bg-white rounded-2xl p-6">
        <h2 id="prefs-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
          {t('parentDash.preferences')}
        </h2>
        <div className="flex items-center justify-between gap-4">
          <span className="font-body text-sm text-gray-500">{t('parentDash.language')}</span>
          <LanguageSwitcher />
        </div>
      </section>
    </main>
  )
}
