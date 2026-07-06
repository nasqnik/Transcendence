import { type ReactNode, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ModalProps {
  onClose: () => void
  /** id of the element that labels the dialog (aria-labelledby). */
  labelledBy: string
  /** id of the element that describes the dialog (aria-describedby). */
  describedBy?: string
  role?: 'dialog' | 'alertdialog'
  /** Classes for the white card surface (Modal always applies `bg-white`). */
  cardClassName?: string
  children: ReactNode
}

/**
 * Centered modal dialog: dimmed backdrop, focus trap (Tab cycling + Escape to
 * close + focus restore on unmount via useFocusTrap), and click-outside-to-close
 * (mousedown on the backdrop itself). Callers supply the card's shape classes
 * and the labelling element inside `children`.
 */
export default function Modal({
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  cardClassName = '',
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  useFocusTrap(cardRef, onClose)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`bg-white ${cardClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
