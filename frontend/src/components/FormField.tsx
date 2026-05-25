import type { ChangeEvent } from 'react'
import Input, { type InputProps } from './Input'

/** All Input props except `describedBy` (managed internally), plus a required label.
 *  `onChange` is narrowed to required — FormField always controls a value. */
type FormFieldProps = Omit<InputProps, 'describedBy'> & {
  label: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export default function FormField({
  id,
  label,
  error,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-body text-sm font-semibold text-gray-700">
        {label}
      </label>
      <Input
        id={id}
        error={error}
        describedBy={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
