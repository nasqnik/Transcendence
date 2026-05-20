interface ButtonProps {
  children: React.ReactNode
  variant: 'primary' | 'secondary'
  onClick?: () => void
  type?: 'button' | 'submit'
  role?: 'radio'
  'aria-pressed'?: boolean
  'aria-checked'?: boolean
  'aria-label'?: string
}

export default function Button({
  children,
  variant,
  onClick,
  type = 'button',
  role,
  'aria-pressed': ariaPressed,
  'aria-checked': ariaChecked,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const styles = {
    primary: 'bg-primary-500 text-white',
    secondary: 'border-2 border-primary-500 text-primary-500',
  }

  return (
    <button
      type={type}
      role={role}
      aria-pressed={role === 'radio' ? undefined : ariaPressed}
      aria-checked={ariaChecked}
      aria-label={ariaLabel}
      className={`font-body font-semibold px-6 py-3 rounded-xl focus-ring ${styles[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}