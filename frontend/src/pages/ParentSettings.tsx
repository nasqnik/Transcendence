import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { kidsFromToken } from '../api/parent'
import { Link, useNavigate } from 'react-router-dom'
import {
  getMe, updateUsername, changePassword, requestEmailChange, deleteAccount, type MeProfile,
} from '../api/account'
import { getParentAvatar, uploadParentAvatar, deleteParentAvatar } from '../api/avatar'
import { getFieldErrors, getApiErrorKey } from '../api/errors'
import { usePageTitle } from '../hooks/usePageTitle'
import { useFormErrors } from '../hooks/useFormErrors'
import FormField from '../components/FormField'
import Button from '../components/Button'
import Modal from '../components/Modal'
import LanguageSwitcher from '../components/LanguageSwitcher'
import Avatar from '../components/parent/Avatar'

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
        <div className="flex flex-col gap-1">
          <FormField
            id="current-password"
            label={t('parentDash.currentPassword')}
            type="password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); clearFieldError('current_password') }}
            error={fieldErrors.current_password}
            autoComplete="current-password"
          />
          <Link
            to="/forgot-password"
            className="self-start min-h-11 -my-1 inline-flex items-center font-body text-xs font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
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

// Identity + avatar

const MAX_AVATAR_BYTES = 2 * 1024 * 1024  // 2 MB — matches the nginx and backend limits
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function IdentityCard({ displayName }: { displayName?: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const flashError = (msg: string) => {
    setError(msg)
    window.setTimeout(() => setError(null), 4000)
  }

  const { data: avatar } = useQuery({ queryKey: ['parentAvatar'], queryFn: getParentAvatar })
  const hasPhoto = !!avatar?.profile_picture

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: (file: File) => uploadParentAvatar(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parentAvatar'] }),
    onError: (err) => flashError(getFieldErrors(err).profile_picture ?? t('parentDash.avatarUploadFailed')),
  })

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: deleteParentAvatar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parentAvatar'] }),
    onError: () => flashError(t('parentDash.avatarUploadFailed')),
  })

  const busy = uploading || removing

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''  // allow re-picking the same file
    if (!file) return
    setError(null)
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { flashError(t('parentDash.avatarInvalidType')); return }
    if (file.size > MAX_AVATAR_BYTES) { flashError(t('parentDash.avatarTooLarge')); return }
    upload(file)
  }

  return (
    <section className="bg-white rounded-2xl p-6 flex items-center gap-4">
      <Avatar
        src={avatar?.profile_picture}
        name={displayName}
        className="w-16 h-16 rounded-2xl"
        textClassName="text-2xl"
      />
      <div className="min-w-0">
        <p className="font-heading text-xl font-bold text-gray-900 truncate">{displayName}</p>
        <span className="inline-flex items-center mt-1 bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
          {t('auth.parent')}
        </span>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded disabled:opacity-50"
          >
            {uploading ? t('kidDash.settingsSaving') : hasPhoto ? t('parentDash.changePhoto') : t('parentDash.uploadPhoto')}
          </button>
          {hasPhoto && (
            <button
              type="button"
              onClick={() => { setError(null); remove() }}
              disabled={busy}
              className="font-body text-sm font-semibold text-danger-700 hover:opacity-80 focus-ring rounded disabled:opacity-50"
            >
              {removing ? t('kidDash.settingsSaving') : t('parentDash.removePhoto')}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-danger-700 text-white font-body font-semibold text-sm px-5 py-3 rounded-2xl shadow-lg max-w-[90vw] text-center"
        >
          {error}
        </div>
      )}
    </section>
  )
}

// Delete account

function DeleteAccountSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { mutate: destroy, isPending } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { logout(); navigate('/') },
    onError: (err) => setError(t(getApiErrorKey(err))),
  })

  return (
    <section aria-labelledby="danger-heading" className="bg-white rounded-2xl p-6">
      <h2 id="danger-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
        <span aria-hidden="true">⚠️</span> {t('parentDash.deleteAccount')}
      </h2>
      <p className="font-body text-sm text-gray-500 mb-4">{t('parentDash.deleteAccountHint')}</p>
      {/* Solid danger-700 (7.07:1 on white), filled rather than a red text link —
          inside a column of ordinary settings rows the link read as just another
          one, and this is the row that can't be undone. */}
      <button
        type="button"
        onClick={() => { setError(null); setConfirming(true) }}
        className="min-h-11 px-4 inline-flex items-center rounded-xl bg-danger-700 font-body text-sm font-semibold text-white hover:opacity-90 focus-ring transition-opacity"
      >
        {t('parentDash.deleteAccount')}
      </button>

      {confirming && (
        <Modal
          role="alertdialog"
          onClose={() => { if (!isPending) setConfirming(false) }}
          labelledBy="parent-delete-modal-title"
          describedBy="parent-delete-modal-body"
          cardClassName="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        >
          <h2 id="parent-delete-modal-title" className="font-heading text-lg font-bold text-gray-900">
            {t('parentDash.deleteAccountConfirmTitle')}
          </h2>
          <p id="parent-delete-modal-body" className="font-body text-sm text-gray-600">
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
    </section>
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

  return (
    <main
      id="main-content"
      aria-labelledby="settings-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="settings-heading" className="sr-only">{t('parentDash.settings')}</h1>

      <IdentityCard displayName={displayName} />

      {/* Account */}
      <section aria-labelledby="account-heading" className="bg-white rounded-2xl p-6">
        <h2 id="account-heading" className="font-heading text-lg font-bold text-gray-900 mb-2">
          <span aria-hidden="true">👤</span> {t('parentDash.accountDetails')}
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
            <span aria-hidden="true">🔒</span> {t('parentDash.security')}
          </h2>
          <PasswordSection profile={profile} />
        </section>
      )}

      {/* Preferences */}
      <section aria-labelledby="prefs-heading" className="bg-white rounded-2xl p-6">
        <h2 id="prefs-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
          <span aria-hidden="true">🌍</span> {t('parentDash.preferences')}
        </h2>
        <div className="flex items-center justify-between gap-4">
          <span className="font-body text-sm text-gray-500">{t('parentDash.language')}</span>
          <LanguageSwitcher />
        </div>
      </section>

      <DeleteAccountSection />
    </main>
  )
}
