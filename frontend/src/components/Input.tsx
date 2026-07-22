import type { InputHTMLAttributes } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'dir'> {
  /** Required: used to link the label and error message. */
  id: string
  /** Validation error text; drives border colour and aria-invalid. */
  error?: string
  /** Maps to aria-describedby. Managed by FormField; rarely set directly. */
  describedBy?: string
  /** Force text direction. Defaults to 'ltr' for email fields in RTL layouts. */
  dir?: 'ltr' | 'rtl'
}

export default function Input({
  id,
  name,
  type,
  dir,
  error,
  describedBy,
  className,
  ...props
}: InputProps) {
  const hasError = Boolean(error)

  return (
    <input
      {...props}
      id={id}
      name={name ?? id}
      type={type}
      dir={dir ?? (type === 'email' ? 'ltr' : undefined)}
      aria-invalid={hasError || undefined}
      aria-describedby={describedBy}
      className={[
        'font-body w-full px-4 py-3 rounded-xl border-2 focus-ring focus-visible:border-primary-500',
        hasError ? 'border-danger-500' : 'border-gray-300',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
