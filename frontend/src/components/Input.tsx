interface InputProps {
  id: string
  name?: string
  type?: 'email' | 'password' | 'text'
  value: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function Input({
  id,
  name,
  type,
  value,
  placeholder,
  required,
  autoComplete,
  onChange,
}: InputProps) {
  return (
    <input
      id={id}
      name={name ?? id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
      className="font-body w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus-ring focus-visible:border-primary-500"
    />
  )
}