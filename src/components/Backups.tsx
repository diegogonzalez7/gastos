import { useState, type ChangeEvent } from 'react'
import { Download, FileCheck2, FolderOpen, HardDrive, Upload } from 'lucide-react'
import { calendarDay, makeBackup, readBackup, money, type Ledger } from '../ledger'
import { readLedger, restoreLedger, storageMessage } from '../storage'
import { Modal } from './ui'

export function Backups({ onClose, onRestored }: {
  onClose: () => void, onRestored: () => void,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState<{ file: string, ledger: Ledger, current: Ledger } | null>(null)

  async function download() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const backup = makeBackup(await readLedger())
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'mi-dinero-' + calendarDay() + '.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
      setNotice('Copia preparada para descargar.')
    } catch (err) { setError(storageMessage(err)) }
    finally { setBusy(false) }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      let ledger: Ledger
      try { ledger = readBackup(await file.text()) }
      catch (err) { setError(err instanceof Error ? err.message : 'No se ha podido leer la copia.'); return }
      setPreview({ file: file.name, ledger, current: await readLedger() })
    } catch (err) { setError(storageMessage(err)) }
    finally { setBusy(false) }
  }

  async function restore() {
    if (!preview || busy) return
    setBusy(true)
    setError('')
    try { await restoreLedger(preview.ledger, preview.current); onRestored() }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  return <Modal title={preview ? 'Confirmar restauración' : 'Copias de seguridad'} onClose={onClose} busy={busy}>
    {preview ? <div className="confirm-panel">
      <div className="file-preview"><FileCheck2 size={23} /><strong>{preview.file}</strong></div>
      <p>La copia contiene <strong>{preview.ledger.entries.length} {preview.ledger.entries.length === 1 ? 'movimiento' : 'movimientos'}</strong>.
        Al restaurarla se reemplazará todo el historial de este dispositivo, que ahora contiene {preview.current.entries.length}.</p>
      <p>Saldo inicial que se restaurará: <strong>{money(preview.ledger.openingCents)}</strong>.</p>
      {preview.ledger.entries.length === 0 && <p className="form-error">Esta copia dejará tu historial vacío.</p>}
      <div className="action-row">
        <button className="secondary" disabled={busy} onClick={() => { setPreview(null); setError('') }}>Cancelar</button>
        <button className="primary" disabled={busy} onClick={restore}>{busy ? 'Restaurando…' : 'Restaurar copia'}</button>
      </div>
    </div> : <div className="backup-options">
      <p className="local-note"><HardDrive size={19} />Tus movimientos se guardan en este dispositivo. Conserva una copia para recuperarlos o llevarlos a otro móvil.</p>
      <div className="backup-option"><span className="utility-icon"><Download size={21} /></span>
        <div><h3>Exportar copia</h3><p>Descarga los movimientos de todos los meses en un archivo JSON.</p>
          <button className="secondary" disabled={busy} onClick={download}><Download size={16} />Descargar copia</button></div>
      </div>
      <div className="backup-option"><span className="utility-icon"><Upload size={21} /></span>
        <div><h3>Restaurar desde un archivo</h3><p>Elige una copia de Mi Dinero para revisar su contenido antes de restaurarla.</p>
          <label className={'secondary file-button' + (busy ? ' disabled' : '')}><FolderOpen size={16} />Elegir archivo
            <input type="file" aria-label="Archivo de copia" accept=".json,application/json" disabled={busy} onChange={chooseFile} /></label></div>
      </div>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="export-notice" role="status">{notice}</p>}
  </Modal>
}
