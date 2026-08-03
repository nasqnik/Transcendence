import { useTranslation } from 'react-i18next'
import { GoogleLogin } from '@react-oauth/google'

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

  return (
    <div className="flex flex-col items-center gap-3 w-80 max-w-full">
      <div className="flex items-center gap-3 w-full">
        <hr className="flex-1 border-gray-300" />
        <span className="font-body text-xs text-gray-500">{t('auth.orContinueWith')}</span>
        <hr className="flex-1 border-gray-300" />
      </div>
      {/* Unmounted rather than CSS-disabled while busy. `pointer-events-none`
          stops clicks but leaves Google's iframe in the tab order, so a
          keyboard user could still reach and trigger a control the form
          considers disabled. min-h keeps the layout from jumping. */}
      <div className="w-full min-h-[40px]">
        {!disabled && <GoogleLogin
          // Remounts when the language changes. Note this only re-renders the
          // button; Google Identity Services takes its own language from the
          // `hl` parameter on its script URL, which @react-oauth/google does
          // not expose, so the button can show a different language from the
          // page. Out of our hands without dropping the library.
          key={i18n.language}
          onSuccess={credentialResponse => {
            if (credentialResponse.credential) onSuccess(credentialResponse.credential)
          }}
          onError={onError}
          width="100%"
        />}
      </div>
      {hint && (
        <p className="font-body text-xs text-gray-500 text-center">{hint}</p>
      )}
    </div>
  )
}
