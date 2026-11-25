import { useId, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { calendarDay, categories, dateLabel, displayCategory, money, monthLabel, netExpense, newEntryId, parseAmount, refundedCents, validDay, type Entry, type PaymentSource, type Refund } from '../ledger'
import { changeEntry, storageMessage } from '../storage'
import { AmountInput, Modal } from './ui'

export function Refunds({ entry, selected, firstHistoryDay, onClose, onSaved }: {
  firstHistoryDay: string,
  entry: Entry, selected?: Refund, onClose: () => void, onSaved: (message: string) => void,
}) {
  const refunds = entry.refunds ?? []
  const [editing, setEditing] = useState(!!selected || !refunds.length)
  const [original, setOriginal] = useState(selected)
  const [amount, setAmount] = useState(selected ? (selected.cents / 100).toFixed(2).replace('.', ',') : '')
  const [date, setDate] = useState(selected?.date ?? calendarDay())
  const [payment, setPayment] = useState<PaymentSource>(selected?.payment ?? 'bank')
  const [initialDate, setInitialDate] = useState(date)
  const [confirm, setConfirm] = useState<'delete' | 'discard' | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const paymentLabelId = useId()
  const maximum = netExpense(entry) + (original?.cents ?? 0)
  const dirty = amount !== (original ? (original.cents / 100).toFixed(2).replace('.', ',') : '') ||
    date !== initialDate || payment !== (original?.payment ?? 'bank')

  function start(refund?: Refund) {
    const startDate = refund?.date ?? calendarDay()
    setOriginal(refund)
    setAmount(refund ? (refund.cents / 100).toFixed(2).replace('.', ',') : '')
    setDate(startDate)
    setInitialDate(startDate)
    setPayment(refund?.payment ?? 'bank')
    setError('')
    setEditing(true)
  }

  function back() {
    setConfirm(null)
    setError('')
    if (refunds.length && editing) setEditing(false)
    else onClose()
  }

  function requestClose() {
    if (confirm) setConfirm(null)
    else if (editing && dirty) setConfirm('discard')
    else back()
  }

  async function update(next: Refund[], message: string) {
    if (busy) return
    setBusy(true)
    setError('')
    try { await changeEntry(entry, { ...entry, refunds: next }); onSaved(message) }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cents = parseAmount(amount)
    if (!cents || cents > maximum) { setError(`Introduce un importe entre 0,01 € y ${money(maximum)}.`); return }
    if (!validDay(date)) { setError('Elige una fecha de cobro válida.'); return }
    if (date < firstHistoryDay) { setError(`El historial empieza en ${monthLabel(firstHistoryDay.slice(0, 7)).toLocaleLowerCase('es')}.`); return }
    const refund = { id: original?.id ?? newEntryId(), cents, date, payment }
    const next = original ? refunds.map(item => item.id === original.id ? refund : item) : [...refunds, refund]
    void update(next, original ? 'Reembolso actualizado' : 'Reembolso registrado')
  }

  const title = confirm === 'delete' ? 'Eliminar reembolso' : confirm === 'discard' ? '¿Descartar cambios?'
    : editing ? (original ? 'Editar reembolso' : 'Registrar reembolso') : 'Reembolsos'
  return <Modal title={title} onClose={requestClose} busy={busy}>
    {confirm ? <div className="confirm-panel">
      <p>{confirm === 'delete' ? `Se eliminará el reembolso de ${money(original!.cents)} y se actualizarán los saldos.` : 'Los cambios de este reembolso se perderán si los descartas.'}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="action-row">
        <button className="secondary" disabled={busy} onClick={() => { setConfirm(null); setError('') }}>{confirm === 'delete' ? 'Cancelar' : 'Seguir editando'}</button>
        <button className="danger" disabled={busy} onClick={() => confirm === 'delete'
          ? void update(refunds.filter(refund => refund.id !== original!.id), 'Reembolso eliminado') : back()}>
          {confirm === 'delete' ? 'Sí, eliminar' : 'Descartar cambios'}
        </button>
      </div>
    </div> : <div className="refund-panel">
      <p className="refund-subject">{entry.concept || categories[displayCategory(entry.category)].name}</p>
      <dl className="restore-comparison">
        <div><dt>Pagado</dt><dd className="money">{money(entry.cents)}</dd></div>
        <div><dt>Recuperado</dt><dd className="money">{money(refundedCents(entry))}</dd></div>
        <div><dt>Gasto neto</dt><dd className="money">{money(netExpense(entry))}</dd></div>
      </dl>
      {editing ? <form className="entry-form" onSubmit={save}>
        <AmountInput label="Importe del reembolso" value={amount} onChange={setAmount} />
        <label className="field">Fecha del reembolso<input type="date" required min={firstHistoryDay} max="9999-12-31" value={date} onChange={event => setDate(event.target.value)} /></label>
        <div className="field">
          <span id={paymentLabelId}>Recibido en</span>
          <div className="kind-switch" role="group" aria-labelledby={paymentLabelId}>
            <button type="button" aria-pressed={payment === 'bank'} onClick={() => setPayment('bank')}>Cuenta bancaria</button>
            <button type="button" aria-pressed={payment === 'cash'} onClick={() => setPayment('cash')}>Efectivo</button>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary wide" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar reembolso'}</button>
        {original && <button className="text-button delete-link" type="button" disabled={busy} onClick={() => { setError(''); setConfirm('delete') }}><Trash2 size={15} />Eliminar reembolso</button>}
      </form> : <>
        <div className="refund-list" aria-label="Reembolsos registrados">
          {refunds.map(refund => <button className="secondary" key={refund.id} onClick={() => start(refund)}
            aria-label={`Editar reembolso de ${money(refund.cents)} del ${dateLabel(refund.date, { dateStyle: 'short' })}`}>
            <ArrowDownLeft size={16} /><span><strong className="money">{money(refund.cents)}</strong>
              <small>{dateLabel(refund.date, { dateStyle: 'medium' })} · {refund.payment === 'cash' ? 'Efectivo' : 'Cuenta bancaria'}</small></span><ChevronRight size={16} />
          </button>)}
        </div>
        {netExpense(entry) > 0 && <button className="primary wide" onClick={() => start()}><Plus size={16} />Registrar reembolso</button>}
      </>}
    </div>}
  </Modal>
}
