import { useId, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Copy, Trash2 } from 'lucide-react'
import { calendarDay, categories, categoryIds, displayCategory, MAX_CONCEPT, money, monthLabel, newEntryId, parseAmount, validDay, type CategoryId, type Entry, type Kind } from '../ledger'
import { changeEntry, saveEntry, storageMessage } from '../storage'
import { AmountInput, Modal } from './ui'

export interface EditorDraft { original?: Entry, copy?: Entry, category?: CategoryId, date: string }

export function Editor({ draft, onClose, onDuplicate, onSaved }: {
  draft: EditorDraft, onClose: () => void, onDuplicate: (entry: Entry) => void, onSaved: (date: string | null, message: string) => void,
}) {
  const old = draft.original
  const source = old ?? draft.copy
  const initialCategory = source ? displayCategory(source.category) : draft.category ?? 'food'
  const initialKind = categories[initialCategory].kind
  const initialAmount = source ? (source.cents / 100).toFixed(2).replace('.', ',') : ''
  const initialConcept = source?.concept ?? ''
  const [kind, setKind] = useState<Kind>(initialKind)
  const [category, setCategory] = useState<CategoryId>(initialCategory)
  const [amount, setAmount] = useState(initialAmount)
  const [concept, setConcept] = useState(initialConcept)
  const [date, setDate] = useState(draft.date)
  const [discard, setDiscard] = useState<'close' | 'duplicate' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const monthHintId = useId()
  const today = calendarDay()
  const selectedMonth = date.slice(0, 7)
  const differentMonth = validDay(date) && selectedMonth !== today.slice(0, 7)
  const dirty = kind !== initialKind || category !== initialCategory || amount !== initialAmount ||
    concept !== initialConcept || date !== draft.date

  function leave(action: 'close' | 'duplicate') {
    if (action === 'duplicate' && old) onDuplicate(old)
    else onClose()
  }

  function requestClose() {
    if (discard) setDiscard(null)
    else if (confirmDelete) setConfirmDelete(false)
    else if (dirty) setDiscard('close')
    else onClose()
  }

  function selectKind(next: Kind) {
    if (next === kind) return
    setKind(next)
    setCategory(next === 'income' ? 'salary' : 'food')
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const cents = parseAmount(amount)
    if (!cents) { setError('Introduce un importe entre 0,01 € y 999.999.999,99 €, con un máximo de dos decimales.'); return }
    if (!validDay(date)) { setError('Elige una fecha válida.'); return }
    setBusy(true)
    setError('')
    try {
      const entry: Entry = {
        id: old?.id ?? newEntryId(), createdAt: old?.createdAt ?? Date.now(),
        kind, category, concept: concept.trim(), date, cents,
      }
      if (old) await changeEntry(old, entry)
      else await saveEntry(entry)
      onSaved(date, old ? 'Cambios guardados' : 'Movimiento guardado')
    } catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  async function remove() {
    if (!old || busy) return
    setBusy(true)
    setError('')
    try { await changeEntry(old, null); onSaved(null, 'Movimiento eliminado') }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  const title = discard ? '¿Descartar cambios?' : confirmDelete ? 'Eliminar movimiento'
    : old ? 'Editar movimiento' : draft.copy ? 'Duplicar movimiento' : 'Nuevo movimiento'
  return <Modal title={title} onClose={requestClose} busy={busy}>
    {discard ? <div className="confirm-panel">
      <p>Los cambios que has hecho en este formulario se perderán si los descartas.</p>
      <div className="action-row">
        <button className="secondary" autoFocus onClick={() => setDiscard(null)}>Seguir editando</button>
        <button className="danger" onClick={() => leave(discard)}>Descartar cambios</button>
      </div>
    </div> : confirmDelete && old ? <div className="confirm-panel">
      <p>Se eliminará <strong>{old.concept || categories[old.category].name}</strong> (<span className="money">{money(old.cents)}</span>) de tu historial.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="action-row">
        <button className="secondary" disabled={busy} onClick={() => { setConfirmDelete(false); setError('') }}>Cancelar</button>
        <button className="danger" disabled={busy} onClick={remove}>Sí, eliminar</button>
      </div>
    </div> : <form onSubmit={save} className="entry-form">
      <div className="kind-switch" role="group" aria-label="Tipo de movimiento">
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => selectKind('expense')}><ArrowUpRight size={18} />Gasto</button>
        <button type="button" aria-pressed={kind === 'income'} onClick={() => selectKind('income')}><ArrowDownLeft size={18} />Ingreso</button>
      </div>
      <AmountInput label="Importe" value={amount} onChange={setAmount} />
      <div className={'entry-date' + (differentMonth ? ' different-month' : '')}>
        <label className="field">Fecha<input type="date" name="date" required min="0001-01-01" max="9999-12-31"
          aria-describedby={differentMonth ? monthHintId : undefined} value={date} onChange={e => setDate(e.target.value)} /></label>
        <button className="secondary" type="button" disabled={date === today} onClick={() => setDate(today)}>Hoy</button>
        {differentMonth && <p id={monthHintId}>Mes del movimiento: <strong>{monthLabel(selectedMonth)}</strong></p>}
      </div>
      <label className="field">Concepto (opcional)<input name="concept" type="text" inputMode="text" placeholder={kind === 'expense' ? 'Ej. Compra de la semana' : 'Ej. Nómina de este mes'}
        maxLength={MAX_CONCEPT} value={concept} onChange={e => setConcept(e.target.value)} /></label>
      <label className="field">Categoría<select value={category} onChange={e => setCategory(e.target.value as CategoryId)}>
        {(categoryIds.includes(category) ? categoryIds : [category, ...categoryIds]).filter(id => categories[id].kind === kind).map(id => <option key={id} value={id}>{categories[id].name}</option>)}</select></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary wide" type="submit" disabled={busy}>{busy ? 'Guardando…' : old ? 'Guardar cambios' : 'Guardar movimiento'}</button>
      {old && <div className="editor-actions">
        <button className="text-button" type="button" disabled={busy} onClick={() => dirty ? setDiscard('duplicate') : leave('duplicate')}>
          <Copy size={15} />Duplicar movimiento</button>
        <button className="text-button delete-link" type="button" disabled={busy} onClick={() => { setError(''); setConfirmDelete(true) }}>
          <Trash2 size={15} />Eliminar movimiento</button>
      </div>}
    </form>}
  </Modal>
}
