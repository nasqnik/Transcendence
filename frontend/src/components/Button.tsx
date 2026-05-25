import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary'
  children: ReactNode
}

const variantStyles = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50',
  secondary:
    'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 disabled:opacity-50',
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
