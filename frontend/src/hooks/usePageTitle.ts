import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Sets the browser tab title, appending the app name: "Login — KiddoPath".
 *
 * Callers pass only their own label. The suffix lives here rather than at each
 * call site, which is how it drifted before — roughly half the pages spelled
 * out `${t('x')} — ${t('app.name')}` and the rest showed a bare label.
 *
 * Home pages pass the app name itself; that is returned unsuffixed so the tab
 * reads "KiddoPath" rather than "KiddoPath — KiddoPath".
 */
export function usePageTitle(title: string) {
  const { t } = useTranslation()
  const appName = t('app.name')

  useEffect(() => {
    document.title = title === appName ? appName : `${title} — ${appName}`
  }, [title, appName])
}
