import { Bell, CalendarPlus, Download } from 'lucide-react'
import { downloadFile } from '../files'
import { appleReminderShortcut, monthlyAlertCalendar, monthlyAlertTitle, nextMonthlyAlert, reminderDate } from '../reminders'
import { Modal } from './ui'

export function MonthlyAlert({ onClose, onBack }: { onClose: () => void, onBack: () => void }) {
  const first = nextMonthlyAlert()
  return <Modal title="Aviso del cierre mensual" onClose={onClose} onBack={onBack}>
    <div className="entry-form">
      <p className="local-note"><Bell size={19} />Configura un aviso el día 1 a las 09:00 para abrir Mi Dinero y ver el mes que acaba de cerrar.</p>
      <section className="reminder-alert monthly-alert-option">
        <h3>Recordatorios de Apple</h3>
        <p>El atajo «Pago de Mi Dinero» prepara el primer aviso para el {reminderDate(first.getTime())}.
          Después, abre ese aviso en Recordatorios y elige <strong>Repetir → Cada mes</strong>.</p>
        <a className="secondary" href={appleReminderShortcut(monthlyAlertTitle, first.getTime())}><CalendarPlus size={16} />Abrir atajo</a>
        <p><a className="text-button" href="https://github.com/diegogonzalez7/gastos#recordatorios" target="_blank" rel="noreferrer">Cómo configurar el atajo</a></p>
      </section>
      <section className="reminder-alert monthly-alert-option">
        <h3>Calendario</h3>
        <p>Importa la cita una vez en tu calendario. Se repite cada mes e incluye un aviso a la hora de inicio.</p>
        <button className="secondary" onClick={() => downloadFile(new File([monthlyAlertCalendar()], 'mi-dinero-cierre-mensual.ics', { type: 'text/calendar' }))}>
          <Download size={16} />Descargar cita mensual</button>
      </section>
    </div>
  </Modal>
}
