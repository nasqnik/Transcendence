/**
 * Error utilities for axios/DRF responses.
 *
 * - getApiErrorKey + t(key)  = components that store the key and translate later (Login)
 * - parseApiError            = ready-to-show translated string (Signup, invites)
 * - is*                      = boolean helpers for branching, not display
 */

import axios from 'axios'
import i18n from '../i18n/config'

/** Exact backend message → i18n key under `errors.api.*` */
const API_ERROR_KEYS: Record<string, string> = {
  'No active account found with the given credentials.': 'errors.api.invalidCredentials',
  'No active account found with the given credentials': 'errors.api.invalidCredentials',
  'No active kid account found with the given credentials.': 'errors.api.invalidKidCredentials',
  'Kid account is not active yet.': 'errors.api.kidNotActiveYet',
  'Kid account is not active.': 'errors.api.kidNotActive',
  'user with this email already exists.': 'errors.api.emailExists',
  'A user with this email already exists.': 'errors.api.emailExists',
  'A user with that username already exists.': 'errors.api.usernameExists',
  'This username is already taken.': 'errors.api.usernameTaken',
  'Invitation not found.': 'errors.api.invitationNotFound',
  'Invitation has expired.': 'errors.api.invitationExpired',
  'Your account email does not match the invitation email.': 'errors.api.invitationEmailMismatch',
  'This account is inactive.': 'errors.api.accountInactive',
  'Invalid refresh token.': 'errors.api.invalidRefreshToken',
  'Not a kid refresh token.': 'errors.api.notKidRefreshToken',
  'Kid not found.': 'errors.api.kidNotFound',
  'This kid already has the maximum number of guardians.': 'errors.api.maxGuardians',
  'Given token not valid for any token type': 'errors.api.tokenNotValid',
  'Google sign-in is not configured on the server.': 'errors.api.googleNotConfigured',
  'Invalid Google token.': 'errors.api.invalidGoogleToken',
  'Invalid Google token issuer.': 'errors.api.invalidGoogleIssuer',
  'Google email is not verified.': 'errors.api.googleEmailNotVerified',
  'Google account has no email.': 'errors.api.googleNoEmail',
  'This Google account is registered as a kid account. Use kid sign-in instead.': 'errors.api.googleAccountIsKid',
  'This email is registered as a kid account. Use kid sign-in instead.': 'errors.api.emailIsKidAccount',
  'This email is linked to a different Google account.': 'errors.api.googleAccountConflict',
  'Email not verified.': 'errors.api.emailNotVerified',
  'Verify your email first.': 'errors.api.emailNotVerified',
  'Please verify your email before logging in.': 'errors.api.emailNotVerified',
  'Invalid verification token.': 'errors.api.invalidVerificationToken',
  'Verification link has expired.': 'errors.api.verificationExpired',
  'Email is already verified.': 'errors.api.alreadyVerified',
  'This email is already registered.': 'errors.api.emailExists',
  'This password is too common.': 'errors.passwordTooCommon',
  'This password is entirely numeric.': 'errors.passwordEntirelyNumeric',
}

const PASSWORD_ERROR_PREFIXES: Array<{ prefix: string; key: string }> = [
  { prefix: 'This password is too short', key: 'errors.passwordMinLength' },
  { prefix: 'The password is too similar', key: 'errors.passwordTooSimilar' },
]

// ─── Sets for multi-value detail checks ─────────────────────────────────────

const EMAIL_NOT_VERIFIED_DETAILS = new Set([
  'Email not verified.',
  'Verify your email first.',
  'Please verify your email before logging in.',
])

const ACCOUNT_NOT_FOUND_DETAILS = new Set([
  'No active account found with the given credentials.',
  'No active account found with the given credentials',
])

const INVITATION_ACCEPTED_DETAIL = 'Invitation is not pending (status: accepted).'

// ─── Private helpers ─────────────────────────────────────────────────────────

/** Safely extract the response body from an axios (or axios-shaped) error. */
function getErrorPayload(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== 'object') return null
  const data =
    (axios.isAxiosError(error) ? error.response?.data : null) ??
    (error as { response?: { data?: unknown } }).response?.data
  if (!data || typeof data !== 'object') return null
  return data as Record<string, unknown>
}

/** Extract and trim the `detail` string from an axios error, or return ''. */
function getDetail(error: unknown): string {
  const obj = getErrorPayload(error)
  return typeof obj?.detail === 'string' ? obj.detail.trim() : ''
}

function translateServerMessage(message: string): string {
  const trimmed = message.trim()
  const key = API_ERROR_KEYS[trimmed]
  if (key) return i18n.t(key)

  if (trimmed.startsWith('Invitation is not pending')) {
    return i18n.t('errors.api.invitationNotPending')
  }

  for (const { prefix, key } of PASSWORD_ERROR_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return key === 'errors.passwordMinLength'
        ? i18n.t(key, { min: 8 })
        : i18n.t(key)
    }
  }

  // Unknown server text — avoid mixing English into AR/RU UI
  return i18n.t('errors.apiUnknown')
}

function genericError(): string {
  return i18n.t('errors.generic')
}

// ─── Boolean helpers (for branching, not display) ────────────────────────────

/** Returns true if the kid account exists but is waiting for parent to accept the invite. */
export function isKidNotActiveYet(error: unknown): boolean {
  return getDetail(error) === 'Kid account is not active yet.'
}

/** Returns true if the error means the account exists but email isn't verified yet. */
export function isEmailNotVerified(error: unknown): boolean {
  return EMAIL_NOT_VERIFIED_DETAILS.has(getDetail(error))
}

/**
 * Returns true if the error means "no account with this email exists".
 * Used on the accept-invite page to auto-switch to signup.
 */
export function isAccountNotFound(error: unknown): boolean {
  return ACCOUNT_NOT_FOUND_DETAILS.has(getDetail(error))
}

/** Returns true if the invitation was already accepted (backend: "Invitation is not pending (status: accepted).") */
export function isInvitationAlreadyAccepted(error: unknown): boolean {
  const obj = getErrorPayload(error)
  if (!obj) return false
  const detail = getDetail(error)
  if (detail === INVITATION_ACCEPTED_DETAIL) return true
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      if (value[0].trim() === INVITATION_ACCEPTED_DETAIL) return true
    }
    if (typeof value === 'string' && value.trim() === INVITATION_ACCEPTED_DETAIL) return true
  }
  return false
}

/** Returns true if kid login failed due to wrong username/email or password (not "waiting for parent"). */
export function isInvalidKidCredentials(error: unknown): boolean {
  return getDetail(error) === 'No active kid account found with the given credentials.'
}

// ─── Key / string resolution ─────────────────────────────────────────────────

/** Map a backend/axios error to an `errors.*` i18n key (translate in React with `t(key)`). */
export function getApiErrorKey(error: unknown): string {
  const obj = getErrorPayload(error)
  if (!obj) return 'errors.apiUnknown'

  const detail = getDetail(error)
  if (detail) {
    const key = API_ERROR_KEYS[detail]
    if (key) return key
    if (detail.startsWith('Invitation is not pending')) {
      return 'errors.api.invitationNotPending'
    }
    for (const { prefix, key } of PASSWORD_ERROR_PREFIXES) {
      if (detail.startsWith(prefix)) return key
    }
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      const key = API_ERROR_KEYS[value[0].trim()]
      if (key) return key
    }
    if (typeof value === 'string') {
      const key = API_ERROR_KEYS[value.trim()]
      if (key) return key
    }
  }

  return 'errors.apiUnknown'
}

/**
 * i18n key for the login page when parent then kid both failed.
 * Avoids "invalidKidCredentials" after a failed parent attempt (e.g. wrong parent password).
 */
export function dualLoginErrorKey(parentErr: unknown, kidErr: unknown): string {
  if (isEmailNotVerified(kidErr)) {
    return getApiErrorKey(kidErr)
  }
  if (isInvalidKidCredentials(kidErr) && isAccountNotFound(parentErr)) {
    return 'errors.api.invalidCredentials'
  }
  if (!isAccountNotFound(parentErr)) {
    return getApiErrorKey(parentErr)
  }
  return getApiErrorKey(kidErr)
}

/**
 * Turn axios/DRF errors into a localized string.
 * Known backend messages are mapped to `errors.api.*`; others use `errors.apiUnknown`.
 */
export function parseApiError(error: unknown): string {
  const obj = getErrorPayload(error)
  if (!obj) return genericError()

  if (typeof obj.detail === 'string') return translateServerMessage(obj.detail)

  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return translateServerMessage(value[0])
    }
    if (typeof value === 'string') return translateServerMessage(value)
  }

  return genericError()
}
