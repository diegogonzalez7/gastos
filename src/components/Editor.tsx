import { useId, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, Copy, RotateCcw, Trash2 } from 'lucide-react'
import { calendarDay, categories, categoryIds, displayCategory, MAX_CONCEPT, money, monthLabel, netExpense, newEntryId, parseAmount, paymentSource, refundedCents, validDay, type CategoryId, type Entry, type Kind, type PaymentSource } from '../ledger'
import { favoriteName, type Favorite } from '../favorites'
import { changeEntry, saveEntry, storageMessage } from '../storage'
import { AmountInput, Modal } from './ui'

export interface EditorDraft { original?: Entry, copy?: Entry, category?: CategoryId, date: string, favorite?: Favorite, mode?: 'favorite' }

export function Editor({ draft, firstHistoryDay, onClose, onDuplicate, onRefunds, onSaved, onFavorite }: {
  firstHistoryDay: string,
  draft: EditorDraft, onClose: () => void, onDuplicate: (entry: Entry) => void, onSaved: (date: string | null, message: string) => void,
  onFavorite: (id: string, favorite: Favorite | null) => void,
  onRefunds: (entry: Entry) => void,
}) {
  const old = draft.original
  const editingFavorite = draft.mode === 'favorite'
  const oldFavorite = editingFavorite ? draft.favorite : undefined
  const source = old ?? draft.copy ?? draft.favorite
  const initialCategory = source ? displayCategory(source.category) : draft.category ?? 'food'
  const initialKind = categories[initialCategory].kind
  const initialAmount = source ? (source.cents / 100).toFixed(2).replace('.', ',') : ''
  const initialConcept = source?.concept ?? ''
  const initialPayment = paymentSource({ category: initialCategory, payment: source?.payment })
  const [kind, setKind] = useState<Kind>(initialKind)
  const [category, setCategory] = useState<CategoryId>(initialCategory)
  const [payment, setPayment] = useState<PaymentSource>(initialPayment)
  const [amount, setAmount] = useState(initialAmount)
  const [concept, setConcept] = useState(initialConcept)
  const [date, setDate] = useState(draft.date)
  const [discard, setDiscard] = useState<'close' | 'duplicate' | 'refunds' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const monthHintId = useId()
  const paymentLabelId = useId()
  const machineHintId = useId()
  const today = calendarDay()
  const selectedMonth = date.slice(0, 7)
  const differentMonth = validDay(date) && selectedMonth !== today.slice(0, 7)
  const effectivePayment = paymentSource({ category, payment })
  const alreadyRefunded = old ? refundedCents(old) : 0
  const dirty = kind !== initialKind || category !== initialCategory || amount !== initialAmount ||
    concept !== initialConcept || date !== draft.date || effectivePayment !== initialPayment

  function leave(action: 'close' | 'duplicate' | 'refunds') {
    if (action === 'duplicate' && old) onDuplicate(old)
    else if (action === 'refunds' && old) onRefunds(old)
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
    setCategory(next === 'income' ? 'salary' : next === 'withdrawal' ? 'withdrawal' : 'food')
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const cents = parseAmount(amount)
    if (!cents) { setError('Introduce un importe entre 0,01 € y 999.999.999,99 €, con un máximo de dos decimales.'); return }
    if (cents < alreadyRefunded) { setError(`El gasto debe cubrir los ${money(alreadyRefunded)} ya reembolsados.`); return }
    if (!editingFavorite && !validDay(date)) { setError('Elige una fecha válida.'); return }
    if (!editingFavorite && date < firstHistoryDay) { setError(`El historial empieza en ${monthLabel(firstHistoryDay.slice(0, 7)).toLocaleLowerCase('es')}.`); return }
    setBusy(true)
    setError('')
    try {
      const method = kind === 'expense' || effectivePayment === 'cash' ? { payment: effectivePayment } : {}
      if (editingFavorite) {
        const id = oldFavorite?.id ?? newEntryId()
        onFavorite(id, { id, cents, category, concept: concept.trim(), ...method })
        return
      }
      const entry: Entry = {
        id: old?.id ?? newEntryId(), createdAt: old?.createdAt ?? Date.now(),
        kind, category, concept: concept.trim(), date, cents, ...method,
        ...(kind === 'expense' && (draft.favorite || old?.fromFavorite) ? { fromFavorite: true } : {}),
        ...(old?.refunds?.length ? { refunds: old.refunds } : {}),
      }
      if (old) await changeEntry(old, entry)
      else await saveEntry(entry)
      onSaved(date, old ? 'Cambios guardados' : 'Movimiento guardado')
    } catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  async function remove() {
    if ((!old && !oldFavorite) || busy) return
    setBusy(true)
    setError('')
    try {
      if (oldFavorite) onFavorite(oldFavorite.id, null)
      else if (old) { await changeEntry(old, null); onSaved(null, 'Movimiento eliminado') }
    }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  const title = discard ? '¿Descartar cambios?' : confirmDelete ? (oldFavorite ? 'Eliminar favorito' : 'Eliminar movimiento')
    : editingFavorite ? (oldFavorite ? 'Editar favorito' : 'Nuevo favorito')
    : old ? 'Editar movimiento' : draft.copy ? 'Duplicar movimiento' : 'Nuevo movimiento'
  return <Modal title={title} onClose={requestClose} busy={busy}>
    {discard ? <div className="confirm-panel">
      <p>Los cambios que has hecho en este formulario se perderán si los descartas.</p>
      <div className="action-row">
        <button className="secondary" autoFocus onClick={() => setDiscard(null)}>Seguir editando</button>
        <button className="danger" onClick={() => leave(discard)}>Descartar cambios</button>
      </div>
    </div> : confirmDelete && (old || oldFavorite) ? <div className="confirm-panel">
      {oldFavorite ? <p>Se quitará <strong>{favoriteName(oldFavorite)}</strong> de Registro rápido.</p>
        : old && <p>Se eliminará <strong>{old.concept || categories[old.category].name}</strong> (<span className="money">{money(old.cents)}</span>) de tu historial.</p>}
      {alreadyRefunded > 0 && <p>También se eliminarán los reembolsos vinculados a este gasto.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="action-row">
        <button className="secondary" disabled={busy} onClick={() => { setConfirmDelete(false); setError('') }}>Cancelar</button>
        <button className="danger" disabled={busy} onClick={remove}>Sí, eliminar</button>
      </div>
    </div> : <form onSubmit={save} className="entry-form">
      <div className={'kind-switch' + (editingFavorite ? '' : ' movement-kind')} role="group" aria-label="Tipo de movimiento">
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => selectKind('expense')}><ArrowUpRight size={18} />Gasto</button>
        <button type="button" aria-pressed={kind === 'income'} disabled={alreadyRefunded > 0} onClick={() => selectKind('income')}><ArrowDownLeft size={18} />Ingreso</button>
        {!editingFavorite && <button type="button" aria-pressed={kind === 'withdrawal'} disabled={alreadyRefunded > 0} onClick={() => selectKind('withdrawal')}><Banknote size={18} />Retirada</button>}
      </div>
      {alreadyRefunded > 0 && <p className="entry-hint">Este movimiento tiene reembolsos vinculados y se conserva como gasto.</p>}
      {kind === 'withdrawal' && <p className="entry-hint">Sacar efectivo reduce el saldo bancario. Los gastos se registran al usar ese dinero.</p>}
      <AmountInput label="Importe" value={amount} onChange={setAmount} />
      {!editingFavorite && <div className={'entry-date' + (differentMonth ? ' different-month' : '')}>
        <label className="field">Fecha<input type="date" name="date" required min={firstHistoryDay} max="9999-12-31"
          aria-describedby={differentMonth ? monthHintId : undefined} value={date} onChange={e => setDate(e.target.value)} /></label>
        <button className="secondary" type="button" disabled={date === today} onClick={() => setDate(today)}>Hoy</button>
        {differentMonth && <p id={monthHintId}>Mes del movimiento: <strong>{monthLabel(selectedMonth)}</strong></p>}
      </div>}
      <label className="field">Concepto (opcional)<input name="concept" type="text" inputMode="text" placeholder={kind === 'expense' ? 'Ej. Compra de la semana' : kind === 'withdrawal' ? 'Ej. Cajero' : 'Ej. Nómina de este mes'}
        maxLength={MAX_CONCEPT} value={concept} onChange={e => setConcept(e.target.value)} /></label>
      {kind !== 'withdrawal' && <label className="field">Categoría<select value={category} onChange={e => setCategory(e.target.value as CategoryId)}>
        {(categoryIds.includes(category) ? categoryIds : [category, ...categoryIds]).filter(id => categories[id].kind === kind).map(id => <option key={id} value={id}>{categories[id].name}</option>)}</select></label>}
      {kind !== 'withdrawal' && <div className="field">
        <span id={paymentLabelId}>{kind === 'income' ? 'Recibido en' : 'Pagado desde'}</span>
        <div className="kind-switch payment-switch" role="group" aria-labelledby={paymentLabelId}
          aria-describedby={category === 'machine' ? machineHintId : undefined}>
          <button type="button" aria-pressed={effectivePayment === 'bank'} disabled={category === 'machine'} onClick={() => setPayment('bank')}>Cuenta bancaria</button>
          <button type="button" aria-pressed={effectivePayment === 'cash'} onClick={() => setPayment('cash')}>Efectivo</button>
        </div>
        {category === 'machine' && <p id={machineHintId} className="entry-hint">Máquina Trabajo se registra siempre en efectivo.</p>}
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {old?.kind === 'expense' && <div className="refund-entry-action">
        {alreadyRefunded > 0 && <p className="entry-hint">Recuperado <strong className="money">{money(alreadyRefunded)}</strong> · Gasto neto <strong className="money">{money(netExpense(old))}</strong></p>}
        <button className="secondary" type="button" disabled={busy} onClick={() => dirty ? setDiscard('refunds') : leave('refunds')}>
          <RotateCcw size={16} />{alreadyRefunded ? 'Ver reembolsos' : 'Registrar reembolso'}
        </button>
      </div>}
      <button className="primary wide" type="submit" disabled={busy}>{busy ? 'Guardando…' : editingFavorite ? 'Guardar favorito' : old ? 'Guardar cambios' : 'Guardar movimiento'}</button>
      {(old || oldFavorite) && <div className="editor-actions">
        {old && <button className="text-button" type="button" disabled={busy} onClick={() => dirty ? setDiscard('duplicate') : leave('duplicate')}>
          <Copy size={15} />Duplicar movimiento</button>}
        <button className="text-button delete-link" type="button" disabled={busy} onClick={() => { setError(''); setConfirmDelete(true) }}>
          <Trash2 size={15} />{oldFavorite ? 'Eliminar favorito' : 'Eliminar movimiento'}</button>
      </div>}
    </form>}
  </Modal>
}
