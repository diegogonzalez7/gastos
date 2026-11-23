import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import {
  BookOpen, BriefcaseBusiness, Gift, HeartPulse, House, Landmark, Laptop, Layers3,
  Plane, ReceiptText, ShoppingBag, ShoppingBasket, Ticket, TrainFront, X, type LucideIcon,
} from 'lucide-react'
import { categories, type CategoryId } from '../ledger'

const icons: Record<CategoryId, LucideIcon> = {
  food: ShoppingBasket, transport: TrainFront, leisure: Ticket, home: House,
  health: HeartPulse, shopping: ShoppingBag, travel: Plane, education: BookOpen,
  otherExpense: Layers3, salary: BriefcaseBusiness, freelance: Laptop,
  gift: Gift, otherIncome: Landmark,
}

export function CategoryBadge({ category }: { category: CategoryId }) {
  const Icon = icons[category]
  return <span className="category-badge"
    style={{ '--category-color': categories[category].color } as CSSProperties}>
    <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
  </span>
}

export function Brand() {
  return <span className="brand">
    <img width="39" height="39" src={import.meta.env.BASE_URL + 'icons/icon-192.png'} alt="" />
    <span>Mi Dinero</span>
  </span>
}

export function Modal({ title, children, onClose, busy = false, className = '' }: {
  title: string, children: ReactNode, onClose: () => void, busy?: boolean, className?: string,
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus({ preventScroll: true })
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = original }
  }, [])
  return <dialog ref={ref} className={'dialog ' + className} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    onClick={event => { if (event.target === ref.current && !busy) onClose() }}>
    <div className="sheet">
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button sheet-close" aria-label="Cerrar" onClick={onClose} disabled={busy}><X size={19} /></button>
      </div>
      {children}
    </div>
  </dialog>
}

export function EmptyState({ title, description, action }: {
  title: string, description?: string, action?: ReactNode,
}) {
  return <div className="empty-state">
    <div className="empty-art" aria-hidden="true"><i /><ReceiptText size={26} strokeWidth={1.45} /></div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
}
