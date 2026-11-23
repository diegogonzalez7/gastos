import { useState, type FormEvent } from 'react'
import { parseOpening } from '../ledger'
import { saveOpening, storageMessage } from '../storage'
import { AmountInput, Modal } from './ui'

export function OpeningBalance({ original, onClose, onSaved }: {
  original: number, onClose: () => void, onSaved: () => void,
}) {
  const [value, setValue] = useState((Math.abs(original) / 100).toFixed(2).replace('.', ','))
  const [negative, setNegative] = useState(original < 0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    const cents = parseOpening((negative ? '-' : '') + value)
    if (cents === null) { setError('Introduce un saldo entre −999.999.999,99 y 999.999.999,99 €, con hasta dos decimales.'); return }
    setBusy(true)
    try { await saveOpening(cents, original); onSaved() }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }
  return <Modal title="Saldo inicial" onClose={onClose} busy={busy}>
    <form className="entry-form" onSubmit={save}>
      <p>Introduce cuánto dinero tenías antes del primer movimiento de tu historial.</p>
      <AmountInput label="Saldo inicial en euros" value={value} onChange={setValue} selectOnFocus />
      <button type="button" className="secondary" aria-pressed={negative} onClick={() => setNegative(!negative)}>
        {negative ? 'Saldo negativo' : 'Saldo positivo o cero'}
      </button>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary" disabled={busy}>Guardar saldo inicial</button>
    </form>
  </Modal>
}
