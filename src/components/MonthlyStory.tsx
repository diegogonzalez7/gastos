import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, CirclePlay, Wallet } from 'lucide-react'
import { categories, dateLabel, displayCategory, money, monthLabel, netExpense, percent } from '../ledger'
import type { MonthlyReport } from '../monthlyReport'
import { CategoryBadge, FittedAmount, Modal } from './ui'
import './monthly-story.css'

export function MonthlyStoryLink({ month, unread, onClick }: { month: string, unread: boolean, onClick: () => void }) {
  const label = 'Cierre de ' + monthLabel(month).toLocaleLowerCase('es')
  return <button className={'text-button monthly-story-link' + (unread ? ' unread' : '')} onClick={onClick}
    aria-label={label + (unread ? ', nuevo' : '')} aria-haspopup="dialog">
    <CirclePlay size={16} />
    {label}
    {unread && <span className="story-unread" aria-hidden="true" />}
  </button>
}

interface StorySlide {
  title: string
  tone: string
  content: ReactNode
}

function storySlides({ month, totals, closing, movementCount, expenseCount, spendingDays, largestExpense, previous }: MonthlyReport): StorySlide[] {
  const top = totals.breakdown[0]
  const slides: StorySlide[] = [{
    title: 'Balance del mes', tone: 'balance',
    content: <>
      <FittedAmount cents={totals.balance} className="story-amount" />
      {movementCount === 0 ? <p className="story-detail">No hay movimientos registrados en este mes.</p> :
        <div className="story-metrics">
          <div><span><ArrowDownLeft size={15} />Ingresos</span><strong className="money">{money(totals.income)}</strong></div>
          <div><span><ArrowUpRight size={15} />Gastos</span><strong className="money">{money(totals.expense)}</strong></div>
        </div>}
    </>,
  }]

  if (top) {
    slides.push({
      title: 'La categoría en la que más gastaste', tone: 'categories',
      content: <>
        <div className="story-category">
          <span className="story-category-share" style={{ '--share': top.share } as CSSProperties}>
            <CategoryBadge category={top.category} />
          </span>
          <strong>{categories[top.category].name}</strong>
        </div>
        <FittedAmount cents={top.cents} className="story-amount" />
        <p className="story-detail">{percent(top.share)} de tus gastos del mes.</p>
        {totals.breakdown.length > 1 && <ul className="story-breakdown" aria-label="Siguientes categorías por gasto">
          {totals.breakdown.slice(1, 3).map(item => <li key={item.category}>
            <div><span>{categories[item.category].name}</span><strong className="money">{money(item.cents)}</strong></div>
            <div className="story-bar" aria-hidden="true"><i style={{ '--share': item.share } as CSSProperties} /></div>
          </li>)}
        </ul>}
      </>,
    })
  }

  if (largestExpense) {
    const category = displayCategory(largestExpense.category)
    slides.push({
      title: 'Tu mayor gasto', tone: 'expense',
      content: <>
        <FittedAmount cents={netExpense(largestExpense)} className="story-amount" />
        <p className="story-highlight">{largestExpense.concept || categories[category].name}</p>
        <p className="story-detail">{dateLabel(largestExpense.date, { day: 'numeric', month: 'long' })}</p>
        <p className="story-caption">
          {expenseCount} {expenseCount === 1 ? 'gasto' : 'gastos'} en {spendingDays} {spendingDays === 1 ? 'día' : 'días'}.
        </p>
      </>,
    })
  }

  if (movementCount > 0 && previous) {
    const difference = totals.expense - previous.expense
    slides.push({
      title: 'Frente al mes anterior', tone: 'comparison',
      content: <>
        {difference === 0 ? <p className="story-highlight">Gastaste lo mismo</p> : <>
          <FittedAmount cents={Math.abs(difference)} className="story-amount" />
          <p className="story-highlight">{difference > 0 ? 'Más de gasto' : 'Menos de gasto'}</p>
        </>}
        <p className="story-detail">En {monthLabel(previous.month).toLocaleLowerCase('es')} gastaste <strong className="money">{money(previous.expense)}</strong>.</p>
      </>,
    })
  }

  slides.push({
    title: 'Saldo bancario al cierre', tone: 'closing',
    content: <>
      <div className="story-wallet-icon" aria-hidden="true"><Wallet size={27} /></div>
      <FittedAmount cents={closing} className="story-amount" />
      <p className="story-detail">El saldo de tu cuenta bancaria al terminar {monthLabel(month).toLocaleLowerCase('es')}.</p>
      <p className="story-caption">{movementCount} {movementCount === 1 ? 'movimiento registrado' : 'movimientos registrados'}.</p>
    </>,
  })
  return slides
}

export function MonthlyStory({ report, onClose, onHistory }: {
  report: MonthlyReport, onClose: () => void, onHistory: () => void,
}) {
  const [position, setPosition] = useState({ index: 0, direction: 'forward' })
  const touch = useRef<{ x: number, y: number } | null>(null)
  const slides = storySlides(report)
  const index = Math.min(position.index, slides.length - 1)
  const slide = slides[index]
  const last = index === slides.length - 1

  function go(next: number) {
    if (next >= 0 && next < slides.length && next !== index) {
      setPosition({ index: next, direction: next > index ? 'forward' : 'back' })
    }
  }

  return <Modal title="Cierre mensual" className="story-dialog" onClose={onClose} onKeyDown={event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      go(index + (event.key === 'ArrowRight' ? 1 : -1))
    }
  }}>
    <div className="story-progress" role="group" aria-label="Páginas del resumen">
      {slides.map((item, step) => <button key={item.tone} type="button" aria-label={item.title}
        aria-current={step === index ? 'step' : undefined} onClick={() => go(step)} className={step <= index ? 'filled' : ''} />)}
    </div>
    <div className="story-stage" aria-live="polite" aria-atomic="true"
      onPointerDown={event => { if (event.pointerType === 'touch') touch.current = { x: event.clientX, y: event.clientY } }}
      onPointerUp={event => {
        const start = touch.current
        touch.current = null
        if (!start || event.pointerType !== 'touch') return
        const distance = event.clientX - start.x
        if (Math.abs(distance) > 45 && Math.abs(distance) > Math.abs(event.clientY - start.y)) go(index + (distance < 0 ? 1 : -1))
      }}
      onPointerCancel={() => { touch.current = null }}>
      <article key={slide.tone} className={'story-scene story-' + slide.tone} data-direction={position.direction}>
        <div className="story-scene-content">
          {slide.tone === 'balance' && <img className="story-wallet-image" src={import.meta.env.BASE_URL + 'cartera.webp'} alt="" />}
          <p className="story-month">{monthLabel(report.month)}</p>
          <h3>{slide.title}</h3>
          {slide.content}
        </div>
      </article>
    </div>
    <div className="story-actions">
      <button className="secondary story-back" aria-label="Historia anterior" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={20} /></button>
      {last ? <button className="primary" onClick={onHistory}>Ver movimientos<ArrowRight size={17} /></button>
        : <button className="primary" onClick={() => go(index + 1)}>Siguiente<ChevronRight size={20} /></button>}
    </div>
  </Modal>
}
