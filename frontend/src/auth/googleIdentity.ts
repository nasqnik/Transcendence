import type {
  CredentialResponse,
  GsiButtonConfiguration,
  IdConfiguration,
} from '@react-oauth/google'

/**
 * Thin wrapper over Google Identity Services, replacing `<GoogleLogin>`.
 *
 * The library component calls `google.accounts.id.initialize()` from its own
 * effect, once per mount, and never tears it down. GSI is a global singleton,
 * so the second mount — walking from /login to /signup, say — logs
 * "initialize() is called multiple times". There is no way to avoid that from
 * outside the component, because it owns the call.
 *
 * So we make the call ourselves: `initialize()` once for the page, and
 * `renderButton()` per mount, which is what GSI expects and does not warn.
 *
 * The script itself is still loaded by `<GoogleOAuthProvider>`; only the button
 * is ours. `useGoogleOAuth()` reports when the script is ready.
 */

/** GSI accepts `locale`; the library's type omits it. */
export type ButtonOptions = GsiButtonConfiguration & { locale?: string }

interface GoogleIdApi {
  initialize(config: IdConfiguration): void
  renderButton(parent: HTMLElement, options: ButtonOptions): void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } }
  }
}

export function getGoogleId(): GoogleIdApi | undefined {
  return window.google?.accounts?.id
}

/**
 * Handlers are stacked, and the credential goes to the most recent one.
 *
 * `initialize()` takes a single global callback, but each mounted button wants
 * its own — the login page establishes a session, the signup page holds the
 * token for the profile step. Only one button is on screen at a time, so the
 * newest registration is the live one; the stack just makes the bookkeeping
 * survive a mount that overlaps an unmount.
 */
type CredentialHandler = (credential: string | undefined) => void

const handlers: CredentialHandler[] = []

function dispatch(response: CredentialResponse) {
  handlers[handlers.length - 1]?.(response.credential)
}

export function registerCredentialHandler(handler: CredentialHandler): () => void {
  handlers.push(handler)
  return () => {
    const index = handlers.lastIndexOf(handler)
    if (index !== -1) handlers.splice(index, 1)
  }
}

/**
 * Tracks the client id rather than a boolean so a changed id re-initializes,
 * while the usual case — same id, another mount — does nothing.
 */
let initializedFor: string | null = null

/** Returns false when the GSI script has not finished loading yet. */
export function ensureGoogleInitialized(clientId: string): boolean {
  const api = getGoogleId()
  if (!api) return false
  if (initializedFor === clientId) return true

  api.initialize({
    client_id: clientId,
    callback: dispatch,
    // Use the browser's FedCM account chooser rather than a cross-origin
    // popup. The popup flow ends with Google's page postMessaging through
    // window.opener, and accounts.google.com sets its own restrictive COOP, so
    // the browser severs that link and logs a Cross-Origin-Opener-Policy
    // error. No popup, no opener link to sever.
    use_fedcm_for_button: true,
  })
  initializedFor = clientId
  return true
}

/** Test seam: lets a suite reset the module-level singleton between cases. */
export function resetGoogleIdentityForTests() {
  initializedFor = null
  handlers.length = 0
}
