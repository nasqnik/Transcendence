import { type ReactNode, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
 * (mousedown on the backdrop itself). Portals to document.body and marks all
 * other body children as `inert` so background content is unreachable by
 * keyboard and assistive technology.
 */
export default function Modal({
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  cardClassName = '',
  children,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Declared BEFORE useFocusTrap so React runs this cleanup first on unmount:
  // inert must be removed before useFocusTrap tries to restore focus,
  // otherwise the previously-focused element is unreachable and focus silently fails.
  useEffect(() => {
    const backdrop = backdropRef.current
    if (!backdrop) return
    const toInert = Array.from(document.body.children).filter(
      el => el !== backdrop && !el.hasAttribute('inert')
    )
    toInert.forEach(el => el.setAttribute('inert', ''))
    return () => toInert.forEach(el => el.removeAttribute('inert'))
  }, [])

  useFocusTrap(cardRef, onClose)

  return createPortal(
    <div
      ref={backdropRef}
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
    </div>,
    document.body
  )
}
