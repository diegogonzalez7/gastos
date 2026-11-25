import { useId, useState, type FormEvent } from 'react'
import { calendarDay, capitalize, dateLabel, validMonth } from '../ledger'
import { saveHistoryStart, storageMessage } from '../storage'
import { Modal } from './ui'

const months = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, '0')
  return { value, label: capitalize(dateLabel(`2026-${value}-01`, { month: 'long' })) }
})

export function HistorySettings({ start, onClose, onBack, onSaved }: {
  start: string, onClose: () => void, onBack: () => void, onSaved: (month: string) => void,
}) {
  const current = calendarDay().slice(0, 7)
  const currentYear = Number(current.slice(0, 4))
  const [year, setYear] = useState(start.slice(0, 4))
  const [month, setMonth] = useState(start.slice(5, 7))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const monthId = useId()
  const next = year.trim().padStart(4, '0') + '-' + month

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!validMonth(next) || next > current) { setError('Elige un mes válido hasta el mes actual.'); return }
    setBusy(true)
    setError('')
    try { await saveHistoryStart(next); onSaved(next) }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  return <Modal title="General" onClose={onClose} onBack={onBack} busy={busy}>
    <form className="entry-form" onSubmit={save}>
      <div>
        <h3>Mes de inicio</h3>
        <p className="entry-hint">El calendario y los movimientos visibles empiezan en este mes. Las copias conservan todos los movimientos guardados.</p>
      </div>
      <div className="history-settings-fields">
        <div className="field"><label htmlFor={monthId}>Mes</label><select id={monthId} value={month} onChange={event => setMonth(event.target.value)}>
          {months.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></div>
        <label className="field">Año<input type="number" inputMode="numeric" min="1" max={currentYear} required value={year}
          onChange={event => setYear(event.target.value)} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary wide" type="submit" disabled={busy || start === next}>{busy ? 'Guardando…' : 'Guardar mes de inicio'}</button>
    </form>
    <details className="iphone-install"><summary>Instalar en la pantalla de inicio del iPhone</summary>
      <p>Abre Mi Dinero en Safari mediante HTTPS. Pulsa Compartir, elige Añadir a la pantalla de inicio y confirma con Añadir. Si aparece Abrir como app web, déjalo activado.</p>
    </details>
  </Modal>
}
