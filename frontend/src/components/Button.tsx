import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary'
  children: ReactNode
}

const variantStyles = {
  // bg-primary-500 fails WCAG AA contrast (3.76:1) with white text at this
  // size/weight — primary-600 (6.93:1) is the lightest shade that passes.
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 disabled:opacity-50',
  // border-primary-500 still passes the 3:1 non-text contrast minimum for a
  // UI component boundary, but the text itself needs the darker shade.
  secondary:
    'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:opacity-50',
} as const

export default function Button({
  children,
  variant,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[
        'font-body font-semibold px-6 py-3 rounded-xl focus-ring',
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
