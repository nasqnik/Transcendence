/**
 * The address the legal pages tell people to write to.
 *
 * Sourced from `DEFAULT_FROM_EMAIL` — the same mailbox the service already
 * sends verification and invitation mail from — mapped into the client as
 * `VITE_CONTACT_EMAIL` by docker-compose. The privacy and terms pages used to
 * name `privacy@kiddopath.app` and `legal@kiddopath.app`, neither of which
 * exists, so a parent exercising a data request had nowhere to write.
 *
 * The fallback only applies when the variable is missing from the environment;
 * it is a placeholder domain, not a real inbox, so an unconfigured deployment
 * fails visibly rather than silently pointing at someone's personal address.
 */
export const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL || 'support@kiddopath.app'
