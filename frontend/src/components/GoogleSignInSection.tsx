import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGoogleOAuth } from '@react-oauth/google'
import {
  ensureGoogleInitialized,
  getGoogleId,
  registerCredentialHandler,
} from '../auth/googleIdentity'

interface GoogleSignInSectionProps {
  onSuccess: (credential: string) => void
  onError?: () => void
  hint?: string
  disabled?: boolean
}

export default function GoogleSignInSection({
  onSuccess,
  onError,
  hint,
  disabled = false,
}: GoogleSignInSectionProps) {
  const { t, i18n } = useTranslation()
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonHostRef = useRef<HTMLDivElement>(null)
  // Rendering the button needs a pixel width, so it waits for a measurement.
  // min-h on the host keeps the layout from jumping while it does.
  const [buttonWidth, setButtonWidth] = useState<number | null>(null)

  // Read through refs so a fresh inline callback each render does not re-run
  // the render effect — re-rendering the button on every keystroke of the form
  // above it would be wasteful and makes the button flicker.
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    setButtonWidth(el.offsetWidth)
    // Debounced so a drag-resize settles into one re-render rather than
    // re-rendering the button on every intermediate width.
    let timer: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(() => setButtonWidth(el.offsetWidth), 150)
    })
    ro.observe(el)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const host = buttonHostRef.current
    if (disabled || buttonWidth === null || !scriptLoadedSuccessfully || !host) return
    if (!ensureGoogleInitialized(clientId)) return

    const unregister = registerCredentialHandler(credential => {
      if (credential) onSuccessRef.current(credential)
      else onErrorRef.current?.()
    })

    // GSI appends to the host rather than replacing, so clear it first —
    // otherwise a locale or width change stacks a second button underneath.
    host.replaceChildren()
    getGoogleId()?.renderButton(host, {
      width: buttonWidth,
      // GSI takes the button's language here. The old component had no way to
      // pass it, so the button could sit in English on a Russian page.
      locale: i18n.language,
    })

    return () => {
      unregister()
      host.replaceChildren()
    }
  }, [disabled, buttonWidth, scriptLoadedSuccessfully, clientId, i18n.language])

  return (
    <div className="flex flex-col items-center gap-3 w-80 max-w-full">
      <div className="flex items-center gap-3 w-full">
        <hr className="flex-1 border-gray-300" />
        <span className="font-body text-xs text-gray-500">{t('auth.orContinueWith')}</span>
        <hr className="flex-1 border-gray-300" />
      </div>
      {/* Emptied rather than CSS-disabled while busy. `pointer-events-none`
          stops clicks but leaves Google's iframe in the tab order, so a
          keyboard user could still reach and trigger a control the form
          considers disabled. */}
      <div ref={wrapperRef} className="w-full min-h-[40px]">
        <div ref={buttonHostRef} />
      </div>
      {hint && (
        <p className="font-body text-xs text-gray-500 text-center">{hint}</p>
      )}
    </div>
  )
}
