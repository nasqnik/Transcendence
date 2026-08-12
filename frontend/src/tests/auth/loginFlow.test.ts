import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', async () => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  // Not mocked away: the flow decodes the real token to learn the role, and
  // stubbing that would let a broken decode pass unnoticed.
  decodeJWT: (await vi.importActual<typeof import('../../api/auth')>('../../api/auth')).decodeJWT,
}))
vi.mock('../../auth/session', () => ({
  establishParentSession: vi.fn(),
  establishKidSession: vi.fn(),
  dashboardPathForRole: vi.fn(() => '/'),
  PARENT_DASHBOARD_PATH: '/parent/dashboard',
  KID_DASHBOARD_PATH: '/dashboard',
}))

import { attemptDualRoleLogin } from '../../auth/loginFlow'
import { login, loginWithGoogle } from '../../api/auth'
import { establishParentSession, establishKidSession } from '../../auth/session'

const mockLoginParent = vi.mocked(login)
const mockLoginWithGoogle = vi.mocked(loginWithGoogle)
const mockEstablishParentSession = vi.mocked(establishParentSession)
const mockEstablishKidSession = vi.mocked(establishKidSession)

/** A token whose payload carries the role, which is all the flow reads. */
function tokensFor(role: 'parent' | 'kid') {
  const payload = btoa(JSON.stringify({ role, username: 'someone' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return { access: `header.${payload}.signature`, refresh: `${role}-refresh` }
}

const rejectWith = (detail: string) => ({ response: { data: { detail } } })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('password login', () => {
  it('starts a parent session when the token says parent', async () => {
    const tokens = tokensFor('parent')
    mockLoginParent.mockResolvedValue(tokens)

    const result = await attemptDualRoleLogin({
      type: 'password', identifier: 'alice', password: 'secret123',
    })

    expect(result).toEqual({ status: 'success' })
    expect(mockEstablishParentSession).toHaveBeenCalledWith(tokens, undefined)
    expect(mockEstablishKidSession).not.toHaveBeenCalled()
  })

  it('starts a kid session from the same endpoint', async () => {
    // The point of the change: one request serves both roles, so a kid logging
    // in no longer needs a failed parent attempt first.
    const tokens = tokensFor('kid')
    mockLoginParent.mockResolvedValue(tokens)

    const result = await attemptDualRoleLogin({
      type: 'password', identifier: 'kiddo', password: 'secret123',
    })

    expect(result).toEqual({ status: 'success' })
    expect(mockEstablishKidSession).toHaveBeenCalledWith(tokens, undefined)
    expect(mockEstablishParentSession).not.toHaveBeenCalled()
  })

  it('makes exactly one request for a kid', async () => {
    // A second, failing request is what Chrome logged as a console error, and
    // no try/catch can suppress that — it comes from the network layer.
    mockLoginParent.mockResolvedValue(tokensFor('kid'))

    await attemptDualRoleLogin({
      type: 'password', identifier: 'kiddo', password: 'secret123',
    })

    expect(mockLoginParent).toHaveBeenCalledTimes(1)
    expect(mockLoginWithGoogle).not.toHaveBeenCalled()
  })

  it('sends a kid whose parent has not accepted yet to their own screen', async () => {
    mockLoginParent.mockRejectedValue(rejectWith('Kid account is not active yet.'))

    const result = await attemptDualRoleLogin({
      type: 'password', identifier: 'kiddo', password: 'secret123',
    })

    expect(result).toEqual({ status: 'waiting_for_parent' })
  })

  it('keeps the unverified-email message distinct', async () => {
    mockLoginParent.mockRejectedValue(rejectWith('Verify your email first.'))

    const result = await attemptDualRoleLogin({
      type: 'password', identifier: 'alice', password: 'secret123',
    })

    expect(result).toEqual({ status: 'error', errorKey: 'errors.api.emailNotVerified' })
  })

  it('reports bad credentials', async () => {
    mockLoginParent.mockRejectedValue(
      rejectWith('No active account found with the given credentials.')
    )

    const result = await attemptDualRoleLogin({
      type: 'password', identifier: 'nobody', password: 'secret123',
    })

    expect(result.status).toBe('error')
  })
})

describe('Google login', () => {
  it('starts a parent session when the token says parent', async () => {
    const tokens = tokensFor('parent')
    mockLoginWithGoogle.mockResolvedValue(tokens)

    const result = await attemptDualRoleLogin({ type: 'google', credential: 'id-token' })

    expect(result).toEqual({ status: 'success' })
    expect(mockEstablishParentSession).toHaveBeenCalledWith(tokens, undefined)
  })

  it('starts a kid session without a failed parent attempt first', async () => {
    const tokens = tokensFor('kid')
    mockLoginWithGoogle.mockResolvedValue(tokens)

    const result = await attemptDualRoleLogin({ type: 'google', credential: 'id-token' })

    expect(result).toEqual({ status: 'success' })
    expect(mockEstablishKidSession).toHaveBeenCalledWith(tokens, undefined)
    expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1)
  })

  it('keeps the linked-to-another-Google-account message', async () => {
    mockLoginWithGoogle.mockRejectedValue(
      rejectWith('This email is linked to a different Google account.')
    )

    const result = await attemptDualRoleLogin({ type: 'google', credential: 'id-token' })

    expect(result.status).toBe('error')
    expect((result as { errorKey: string }).errorKey).not.toBe('errors.api.unknown')
  })
})
