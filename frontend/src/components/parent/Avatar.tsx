interface AvatarProps {
  /** Uploaded picture URL; falls back to the initial when absent. */
  src?: string | null
  /** Used for the initial fallback + img alt. */
  name?: string
  /** Sizing + shape classes, e.g. "w-10 h-10 rounded-full". */
  className?: string
  /** Font-size class for the initial fallback, e.g. "text-2xl". */
  textClassName?: string
}

/** Parent/kid avatar: shows the uploaded image, or a colored initial placeholder. */
export default function Avatar({ src, name, className = '', textClassName = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={`object-cover shrink-0 ${className}`}
      />
    )
  }
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?'
  return (
    <div
      aria-hidden="true"
      className={`bg-primary-100 text-primary-700 flex items-center justify-center font-heading font-bold shrink-0 ${textClassName} ${className}`}
    >
      {initial}
    </div>
  )
}
