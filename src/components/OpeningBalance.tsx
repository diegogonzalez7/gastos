import { useState, type FormEvent } from 'react'
import { parseOpening } from '../ledger'
import { saveOpening, storageMessage } from '../storage'
import { Modal } from './ui'

export function OpeningBalance({ original, onClose, onSaved }: {
  original: number, onClose: () => void, onSaved: () => void,
}) {
  const [value, setValue] = useState((original / 100).toFixed(2).replace('.', ','))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    const cents = parseOpening(value)
    if (cents === null) { setError('Introduce un saldo entre −999.999.999,99 y 999.999.999,99 €, con hasta dos decimales.'); return }
    setBusy(true)
    try { await saveOpening(cents, original); onSaved() }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }
  return <Modal title="Saldo inicial" onClose={onClose} busy={busy}>
    <form className="entry-form" onSubmit={save}>
      <p>Introduce cuánto dinero tenías antes del primer movimiento de tu historial.</p>
      <label className="field">Saldo inicial en euros<input required data-initial-focus value={value}
        onFocus={event => event.target.select()} onChange={event => setValue(event.target.value)} /></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary" disabled={busy}>Guardar saldo inicial</button>
    </form>
  </Modal>
}
