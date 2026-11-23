import { useState, type FormEvent } from 'react'
import { Bell, CalendarPlus, ChevronRight, Download, Plus, Share2, Trash2 } from 'lucide-react'
import { downloadFile } from '../files'
import { newEntryId } from '../ledger'
import {
  parseReminderTime, reminderCalendar, reminderDate, reminderInput, reminderShortcut,
  reminderTitleLimit, type Reminder,
} from '../reminders'
import { changeReminder, saveReminder, storageMessage } from '../storage'
import { Modal } from './ui'

function nextMorning() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return reminderInput(date.getTime())
}

function calendarFile(reminder: Reminder) {
  return new File([reminderCalendar(reminder)], 'mi-dinero-pago.ics', { type: 'text/calendar' })
}

export function Reminders({ reminders, onClose, onChange }: {
  reminders: Reminder[], onClose: () => void, onChange: () => void,
}) {
  const [form, setForm] = useState<{ original?: Reminder, title: string, dateTime: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const original = form?.original
  const clean = form && original && form.title === original.title && form.dateTime === reminderInput(original.at)
  const availableAlert = !!(clean && original && !original.paid && original.at > Date.now())
  const [canShare] = useState(() => !!navigator.share &&
    !!navigator.canShare?.({ files: [new File(['BEGIN:VCALENDAR'], 'pago.ics', { type: 'text/calendar' })] }))

  function open(reminder?: Reminder) {
    setConfirmDelete(false)
    setError('')
    setNotice('')
    setForm({
      original: reminder,
      title: reminder?.title ?? '',
      dateTime: reminder ? reminderInput(reminder.at) : nextMorning(),
    })
  }

  function back() {
    if (confirmDelete) { setConfirmDelete(false); return }
    if (!form) { onClose(); return }
    setForm(null)
    setError('')
    setNotice('')
  }

  async function update(replacement: Reminder | null, message: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (original) await changeReminder(original, replacement)
      else if (replacement) await saveReminder(replacement)
      if (replacement) open(replacement)
      else { setConfirmDelete(false); setForm(null) }
      onChange()
      setNotice(message)
    } catch (err) { setError(storageMessage(err)) }
    finally { setBusy(false) }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || busy) return
    const at = original && form.dateTime === reminderInput(original.at) ? original.at : parseReminderTime(form.dateTime)
    const title = form.title.trim()
    if (!title) { setError('Escribe qué quieres pagar.'); return }
    if (at === null || (at <= Date.now() && at !== original?.at)) {
      setError('Elige una fecha y hora futuras.')
      return
    }
    void update({ id: original?.id ?? newEntryId(), title, at, paid: original?.paid ?? false },
      'Recordatorio guardado.')
  }

  async function share(reminder: Reminder) {
    setError('')
    try { await navigator.share({ files: [calendarFile(reminder)] }) }
    catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('Prueba con Descargar cita para guardar el archivo de calendario.')
      }
    }
  }

  const sorted = [...reminders].sort((a, b) => Number(a.paid) - Number(b.paid) || a.at - b.at)
  const title = confirmDelete ? 'Eliminar recordatorio' : original ? 'Editar recordatorio' : form ? 'Nuevo recordatorio' : 'Recordatorios'

  return <Modal title={title} onClose={back} busy={busy}>
    {confirmDelete && original ? <div className="confirm-panel">
      <p>Se eliminará el recordatorio de <strong>{original.title}</strong>.</p>
      <p>Si añadiste un aviso al calendario o a Recordatorios de Apple, elimínalo también allí.</p>
      <div className="action-row">
        <button className="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button>
        <button className="danger" disabled={busy} onClick={() => update(null, 'Recordatorio eliminado.')}>Sí, eliminar</button>
      </div>
    </div> : form ? <>
      <form className="entry-form" onSubmit={save}>
        <label className="field">Qué quieres pagar<input required maxLength={reminderTitleLimit}
          placeholder="Por ejemplo, el seguro" value={form.title}
          onChange={event => setForm({ ...form, title: event.target.value })} /></label>
        <label className="field">Fecha y hora del aviso<input type="datetime-local" required
          max="9999-12-31T23:59" value={form.dateTime}
          onChange={event => setForm({ ...form, dateTime: event.target.value })} /></label>
        <button className="primary" disabled={busy || !!clean}>Guardar recordatorio</button>
      </form>
      {original && <>
        {availableAlert && <section className="reminder-alert">
          <h3>Programar aviso</h3>
          <p>Añade la cita a tu calendario con una alerta a la hora elegida. Si cambias la fecha o pagas antes, actualiza el aviso también allí.</p>
          <div className="backup-actions">
            <button className="secondary" onClick={() => downloadFile(calendarFile(original))}><Download size={16} />Descargar cita</button>
            {canShare && <button className="secondary" onClick={() => share(original)}><Share2 size={16} />Compartir cita</button>}
          </div>
          <details className="reminder-help">
            <summary>Usar Recordatorios de Apple</summary>
            <p>Si ya tienes configurado el atajo «Pago de Mi Dinero», puedes enviarle este pago.</p>
            <a className="secondary" href={reminderShortcut(original)}><CalendarPlus size={16} />Abrir atajo</a>
            <p><a className="text-button" href="https://github.com/diegogonzalez7/gastos#recordatorios" target="_blank" rel="noreferrer">Cómo configurar el atajo</a></p>
          </details>
        </section>}
        <div className="editor-actions reminder-edit-actions">
          <button className="text-button" disabled={busy || !clean}
            onClick={() => update({ ...original, paid: !original.paid }, original.paid ? 'Recordatorio pendiente.'
              : 'Pago marcado como hecho. Si programaste un aviso, actualízalo también en la otra app.')}>
            {original.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
          </button>
          <button className="text-button delete-link" disabled={busy}
            onClick={() => { setConfirmDelete(true); setError(''); setNotice('') }}><Trash2 size={15} />Eliminar recordatorio</button>
        </div>
      </>}
    </> : <div className="entry-form">
      <button className="primary" onClick={() => open()}><Plus size={18} />Nuevo recordatorio</button>
      {!sorted.length ? <p className="local-note"><Bell size={17} />Añade un pago y elige cuándo quieres recibir el aviso.</p> :
        <div className="reminder-list">{sorted.map(reminder => <button key={reminder.id} onClick={() => open(reminder)} className="entry-row">
          <span className="entry-info"><strong>{reminder.title}</strong><small>
            {reminder.paid ? 'Pagado · ' : reminder.at <= Date.now() ? 'Vencido · ' : ''}{reminderDate(reminder.at)}
          </small></span>
          <ChevronRight size={15} className="entry-chevron" />
        </button>)}</div>}
    </div>}
    {error && <p className="form-error reminder-feedback" role="alert">{error}</p>}
    {notice && <p className="export-notice" role="status">{notice}</p>}
  </Modal>
}
