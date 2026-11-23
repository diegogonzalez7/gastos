import { useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react'
import { categories, categoryIds, displayCategory, MAX_CONCEPT, money, newEntryId, parseAmount, validDay, type CategoryId, type Entry, type Kind } from '../ledger'
import { changeEntry, saveEntry, storageMessage } from '../storage'
import { Modal } from './ui'

export interface EditorDraft { original?: Entry, category?: CategoryId, date: string }

export function Editor({ draft, onClose, onSaved }: {
  draft: EditorDraft, onClose: () => void, onSaved: (date: string | null, message: string) => void,
}) {
  const old = draft.original
  const initialCategory = old ? displayCategory(old.category) : draft.category ?? 'food'
  const [kind, setKind] = useState<Kind>(categories[initialCategory].kind)
  const [category, setCategory] = useState<CategoryId>(initialCategory)
  const [amount, setAmount] = useState(old ? (old.cents / 100).toFixed(2).replace('.', ',') : '')
  const [concept, setConcept] = useState(old?.concept ?? '')
  const [date, setDate] = useState(old?.date ?? draft.date)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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

  return <Modal title={confirmDelete ? 'Eliminar movimiento' : old ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={onClose} busy={busy}>
    {confirmDelete && old ? <div className="confirm-panel">
      <p>Se eliminará <strong>{old.concept || categories[old.category].name}</strong> ({money(old.cents)}) de tu historial.</p>
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
      <label className="field">Importe
        <span className="amount-input"><input name="amount" type="text" inputMode="decimal" placeholder="0,00" aria-label="Importe"
          maxLength={20} required autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)} /><span>€</span></span>
      </label>
      <label className="field">Concepto (opcional)<input name="concept" type="text" inputMode="text" placeholder={kind === 'expense' ? 'Ej. Compra de la semana' : 'Ej. Nómina de este mes'}
        maxLength={MAX_CONCEPT} value={concept} onChange={e => setConcept(e.target.value)} /></label>
      <div className="form-columns">
        <label className="field">Categoría<select value={category} onChange={e => setCategory(e.target.value as CategoryId)}>
          {(categoryIds.includes(category) ? categoryIds : [category, ...categoryIds]).filter(id => categories[id].kind === kind).map(id => <option key={id} value={id}>{categories[id].name}</option>)}</select></label>
        <label className="field">Fecha<input type="date" name="date" required min="0001-01-01" max="9999-12-31"
          value={date} onChange={e => setDate(e.target.value)} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary wide" type="submit" disabled={busy}>{busy ? 'Guardando…' : old ? 'Guardar cambios' : 'Guardar movimiento'}</button>
      {old && <button className="text-button delete-link" type="button" disabled={busy} onClick={() => { setError(''); setConfirmDelete(true) }}>
        <Trash2 size={15} />Eliminar movimiento</button>}
    </form>}
  </Modal>
}
