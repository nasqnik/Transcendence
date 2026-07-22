import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
  error?: string
  errorId: string
}

export default function TermsCheckbox({ checked, onChange, disabled, error, errorId }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 accent-primary-600"
        />
        <span className="font-body text-sm text-gray-600">
          {t('auth.agreeToTermsPrefix')}{' '}
          <Link to="/terms" target="_blank" rel="noopener" className="text-primary-600 hover:text-primary-700 underline focus-ring rounded-sm">
            {t('legal.terms')}
          </Link>{' '}
          {t('common.and')}{' '}
          <Link to="/privacy" target="_blank" rel="noopener" className="text-primary-600 hover:text-primary-700 underline focus-ring rounded-sm">
            {t('legal.privacy')}
          </Link>
        </span>
      </label>
      {error && (
        <p id={errorId} className="font-body text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
