import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import {
  Coffee, Music, PawPrint, Scissors, Shirt, Utensils, BookOpen, BriefcaseBusiness, Gift, HeartPulse, House, Landmark, Laptop, Layers3,
  Plane, ReceiptText, ShoppingBag, ShoppingBasket, Ticket, TrainFront, X, type LucideIcon,
} from 'lucide-react'
import { categories, type CategoryId } from '../ledger'

const icons: Record<CategoryId, LucideIcon> = {
  food: ShoppingBasket, transport: TrainFront, leisure: Ticket, home: House,
  health: HeartPulse, shopping: ShoppingBag, travel: Plane, education: BookOpen,
  otherExpense: Layers3, salary: BriefcaseBusiness, freelance: Laptop,
  supermarket: ShoppingBasket, meal: Utensils, machine: Coffee, clothes: Shirt, hair: Scissors, vet: PawPrint,
  spotify: Music, giftExpense: Gift, bet: Ticket, quiniela: Ticket, betIncome: Ticket, quinielaIncome: Ticket,
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
    const viewport = window.visualViewport
    const fitViewport = () => {
      if (!viewport || window.innerWidth > 520) return
      dialog.style.top = viewport.offsetTop + 'px'
      dialog.style.bottom = 'auto'
      dialog.style.height = viewport.height + 'px'
      dialog.style.maxHeight = viewport.height + 'px'
    }
    const revealField = (event: FocusEvent) => {
      const field = event.target
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return
      window.setTimeout(() => field.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300)
    }
    fitViewport()
    viewport?.addEventListener('resize', fitViewport)
    viewport?.addEventListener('scroll', fitViewport)
    dialog.addEventListener('focusin', revealField)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      viewport?.removeEventListener('resize', fitViewport)
      viewport?.removeEventListener('scroll', fitViewport)
      dialog.removeEventListener('focusin', revealField)
      dialog.close()
      document.body.style.overflow = original
    }
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
