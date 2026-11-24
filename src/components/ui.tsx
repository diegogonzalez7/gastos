import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type KeyboardEventHandler, type ReactNode } from 'react'
import {
  Coffee, Music, PawPrint, Scissors, Shirt, Utensils, BookOpen, BriefcaseBusiness, Gift, HeartPulse, House, Landmark, Laptop, Layers3,
  Plane, ReceiptText, ShoppingBag, ShoppingBasket, Ticket, TrainFront, X, type LucideIcon,
} from 'lucide-react'
import { categories, money, type CategoryId } from '../ledger'

const icons: Record<CategoryId, LucideIcon> = {
  food: ShoppingBasket, transport: TrainFront, leisure: Ticket, home: House,
  health: HeartPulse, shopping: ShoppingBag, travel: Plane, education: BookOpen,
  otherExpense: Layers3, salary: BriefcaseBusiness, freelance: Laptop, withdrawal: Landmark,
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

export function FittedAmount({ cents, className }: { cents: number, className: string }) {
  const amount = money(cents)
  const amountBox = useRef<HTMLDivElement>(null)
  const amountMeasure = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const box = amountBox.current!
    const measure = amountMeasure.current!
    function fit() {
      const naturalWidth = measure.getBoundingClientRect().width
      if (!naturalWidth || !box.clientWidth) return
      const scale = Math.min(1, (box.clientWidth - 1) / naturalWidth)
      box.style.setProperty('--balance-scale', String(scale))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [amount])

  return <div ref={amountBox} className={className + ' fitted-amount'}>
    <span ref={amountMeasure} className="fitted-amount-measure money" aria-hidden="true">{amount}</span>
    <span className="fitted-amount-value money">{amount}</span>
  </div>
}

export function AmountInput({ label, value, onChange, selectOnFocus = false }: {
  label: string, value: string, onChange: (value: string) => void, selectOnFocus?: boolean,
}) {
  const placeholder = '0,00'
  return <label className="field">{label}
    <span className="amount-input money">
      <span className="amount-input-value">
        <span className="amount-input-measure" aria-hidden="true">{value || placeholder}</span>
        <input type="text" inputMode="decimal" placeholder={placeholder} aria-label={label}
          maxLength={20} required autoComplete="off" value={value}
          onFocus={selectOnFocus ? event => event.currentTarget.select() : undefined}
          onChange={event => {
            let next = event.currentTarget.value.trim().replace(/^[,.]/, '0,')
            // Keep pasted Spanish amounts with thousands separators editable.
            if (/^-?\d{1,3}(\.\d{3})+,\d{0,2}$/.test(next)) next = next.replaceAll('.', '')
            if (/^-?\d*(?:[,.]\d{0,2})?$/.test(next)) onChange(next)
          }} />
      </span>
      <span className="amount-input-currency" aria-hidden="true">€</span>
    </span>
  </label>
}

export function Modal({ title, children, onClose, busy = false, className = '', onKeyDown }: {
  title: string, children: ReactNode, onClose: () => void, busy?: boolean, className?: string, onKeyDown?: KeyboardEventHandler<HTMLDialogElement>,
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
  return <dialog ref={ref} className={'dialog ' + className} aria-labelledby={titleId} onKeyDown={onKeyDown}
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
