import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { calendarDay, capitalize, dateLabel, monthLabel, shiftMonth } from '../ledger'
import { Modal } from './ui'

interface CalendarProps {
  month: string
  firstHistoryMonth: string
  allMonths: boolean
  allowAll: boolean
  onChange: (month: string, all?: boolean) => void
}

export function MonthControl({ month, firstHistoryMonth, allMonths, allowAll, onChange }: CalendarProps) {
  const [open, setOpen] = useState(false)
  const [selectedYear, setYear] = useState(Number(month.slice(0, 4)))
  const firstYear = Number(firstHistoryMonth.slice(0, 4))
  const year = Math.max(firstYear, selectedYear)
  const label = allMonths ? 'Todos los meses' : monthLabel(month).replace(' de ', ' ')
  const compactLabel = allMonths ? 'Todos' : capitalize(dateLabel(month + '-01', { month: 'short' })) + ' ' + Number(month.slice(0, 4))
  function select(value: string, all = false) {
    onChange(value < firstHistoryMonth ? firstHistoryMonth : value, all)
    setOpen(false)
  }
  return <>
    <div className="month-control" role="group" aria-label="Periodo">
      <button type="button" className="month-step" aria-label="Mes anterior" disabled={allMonths || month <= firstHistoryMonth}
        onClick={() => onChange(shiftMonth(month, -1))}><ChevronLeft size={17} /></button>
      <button type="button" className="month-label" aria-label="Elegir periodo" aria-description={label} title={label} aria-haspopup="dialog"
        onClick={() => { setYear(Number(month.slice(0, 4))); setOpen(true) }}>
        <CalendarDays size={15} /><span className="month-full">{label}</span><span className="month-compact">{compactLabel}</span><ChevronDown size={13} />
      </button>
      <button type="button" className="month-step" aria-label="Mes siguiente" disabled={allMonths || month === '9999-12'}
        onClick={() => onChange(shiftMonth(month, 1))}><ChevronRight size={17} /></button>
    </div>
    {open && <Modal title="Elegir periodo" onClose={() => setOpen(false)} className="calendar-dialog">
      <div className="year-control">
        <button className="icon-button" aria-label="Año anterior" disabled={year <= firstYear} onClick={() => setYear(year - 1)}><ChevronLeft size={19} /></button>
        <strong>{year}</strong>
        <button className="icon-button" aria-label="Año siguiente" disabled={year >= 9999} onClick={() => setYear(year + 1)}><ChevronRight size={19} /></button>
      </div>
      <div className="month-grid">{Array.from({ length: 12 }, (_, i) => {
        const value = String(year).padStart(4, '0') + '-' + String(i + 1).padStart(2, '0')
        return value >= firstHistoryMonth && <button key={value} aria-pressed={!allMonths && value === month} onClick={() => select(value)}>
          {capitalize(dateLabel(value + '-01', { month: 'long' }))}</button>
      })}</div>
      <div className="calendar-actions">
        <button className="secondary" onClick={() => select(calendarDay().slice(0, 7))}>Ir al mes actual</button>
        {allowAll && <button className="secondary" onClick={() => select(month, true)}>Todos los meses</button>}
      </div>
    </Modal>}
  </>
}
