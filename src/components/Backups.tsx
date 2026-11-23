import { useState, type ChangeEvent } from 'react'
import { Download, FileCheck2, FolderOpen, HardDrive, Share2, Upload } from 'lucide-react'
import { downloadFile } from '../files'
import { calendarDay, dateLabel, makeBackup, monthLabel, readBackup, money, validDay, type Ledger } from '../ledger'
import { readLedger, restoreLedger, storageMessage } from '../storage'
import { Modal } from './ui'

const lastExportKey = 'mi-dinero:last-export'
const backupType = 'application/json'

function backupFile(ledger: Ledger, beforeRestoring = false) {
  const prefix = beforeRestoring ? 'mi-dinero-antes-de-restaurar-' : 'mi-dinero-'
  return new File([JSON.stringify(makeBackup(ledger), null, 2)], prefix + calendarDay() + '.json', { type: backupType })
}

function readLastExport() {
  try {
    const saved = localStorage.getItem(lastExportKey)
    return validDay(saved) ? saved : null
  } catch { return null }
}

function monthRange(entries: Ledger['entries']) {
  if (!entries.length) return null
  let first = entries[0].date
  let last = first
  for (const entry of entries) {
    if (entry.date < first) first = entry.date
    if (entry.date > last) last = entry.date
  }
  const firstMonth = first.slice(0, 7)
  const lastMonth = last.slice(0, 7)
  return firstMonth === lastMonth ? monthLabel(firstMonth) : monthLabel(firstMonth) + ' a ' + monthLabel(lastMonth)
}

export function Backups({ ledger, onClose, onRestored }: {
  ledger: Ledger | null, onClose: () => void, onRestored: () => void,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [lastExport, setLastExport] = useState(readLastExport)
  const [canShare] = useState(() => !!navigator.share &&
    !!navigator.canShare?.({ files: [new File(['{}'], 'mi-dinero.json', { type: backupType })] }))
  const [preview, setPreview] = useState<{ file: string, ledger: Ledger, current: Ledger, months: string | null } | null>(null)

  function recordExport(message: string) {
    const date = calendarDay()
    setLastExport(date)
    try { localStorage.setItem(lastExportKey, date) } catch { /* Export also works without Web Storage. */ }
    setNotice(message)
  }

  async function download(beforeRestoring = false) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const file = backupFile(beforeRestoring && preview ? preview.current : await readLedger(), beforeRestoring)
      downloadFile(file)
      recordExport(beforeRestoring ? 'Copia del historial actual preparada para descargar.' : 'Copia preparada para descargar.')
    } catch (err) { setError(storageMessage(err)) }
    finally { setBusy(false) }
  }

  async function share() {
    if (!ledger || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      // Call share in the tap handler so Safari retains the user gesture.
      await navigator.share({ files: [backupFile(ledger)] })
      recordExport('Copia enviada al menú Compartir.')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('No se pudo compartir la copia. Prueba con Descargar copia.')
      }
    } finally { setBusy(false) }
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
      setPreview({ file: file.name, ledger, current: await readLedger(), months: monthRange(ledger.entries) })
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
      {preview.months && <p>Meses incluidos: <strong>{preview.months}</strong>.</p>}
      <p>Saldo inicial que se restaurará: <strong className="money">{money(preview.ledger.openingCents)}</strong>.</p>
      {preview.ledger.reminders && <p>Recordatorios que se restaurarán: <strong>{preview.ledger.reminders.length}</strong>.</p>}
      {preview.ledger.entries.length === 0 && <p className="form-error">Esta copia dejará tu historial vacío.</p>}
      {(preview.current.entries.length > 0 || preview.current.openingCents !== 0 || !!preview.current.reminders?.length) &&
        <button className="secondary save-before-restore" disabled={busy} onClick={() => download(true)}>
          <Download size={16} />Descargar copia del historial actual
        </button>}
      <div className="action-row">
        <button className="secondary" disabled={busy} onClick={() => { setPreview(null); setError(''); setNotice('') }}>Cancelar</button>
        <button className="primary" disabled={busy} onClick={restore}>{busy ? 'Restaurando…' : 'Restaurar copia'}</button>
      </div>
    </div> : <div className="backup-options">
      <p className="local-note"><HardDrive size={19} />Tus movimientos se guardan en este dispositivo. Conserva una copia para recuperarlos o llevarlos a otro móvil.</p>
      <div className="backup-option"><span className="utility-icon"><Download size={21} /></span>
        <div><h3>Exportar copia</h3><p>Guarda tus movimientos, saldo inicial y recordatorios en un archivo JSON. Puedes usar iCloud Drive para abrirlo en otro dispositivo.</p>
          {lastExport && <p>Última exportación: <time dateTime={lastExport}>{dateLabel(lastExport, { dateStyle: 'long' })}</time></p>}
          <div className="backup-actions">
            <button className="secondary" disabled={busy} onClick={() => download()}><Download size={16} />Descargar copia</button>
            {canShare && <button className="secondary" disabled={busy || !ledger} onClick={share}><Share2 size={16} />Compartir copia</button>}
          </div>
        </div>
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
