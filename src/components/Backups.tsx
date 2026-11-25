import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CircleCheck, CloudUpload, Download, FileCheck2, FolderOpen, HardDrive, Share2, Upload } from 'lucide-react'
import { savedDropbox, uploadDropboxBackup, type CloudBackup } from '../dropbox'
import { downloadFile } from '../files'
import { calendarDay, compareEntries, dateLabel, makeBackup, monthLabel, readBackup, money, validDay, type BackupExtras, type Ledger } from '../ledger'
import { readLedger, restoreLedger, storageMessage } from '../storage'
import { CloudBackups } from './CloudBackups'
import { Modal } from './ui'

const lastExportKey = 'mi-dinero:last-export'
const backupType = 'application/json'

type BackupSnapshot = Ledger & Required<BackupExtras>

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
    for (const date of [entry.date, ...(entry.refunds ?? []).map(refund => refund.date)]) {
      if (date < first) first = date
      if (date > last) last = date
    }
  }
  const firstMonth = first.slice(0, 7)
  const lastMonth = last.slice(0, 7)
  return firstMonth === lastMonth ? monthLabel(firstMonth) : monthLabel(firstMonth) + ' a ' + monthLabel(lastMonth)
}

export function Backups({ ledger, onClose, onBack, onRestored }: {
  ledger: BackupSnapshot | null, onClose: () => void, onBack: () => void, onRestored: () => void,
}) {
  const [busy, setBusy] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dropbox, setDropbox] = useState(savedDropbox)
  const [cloudFiles, setCloudFiles] = useState<CloudBackup[] | null>(null)
  const [cloudNotice, setCloudNotice] = useState('')
  const [cloudWarning, setCloudWarning] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const cloudSuccessRef = useRef<HTMLParagraphElement>(null)
  const [lastExport, setLastExport] = useState(readLastExport)
  const [includeFavorites, setIncludeFavorites] = useState(false)
  const [includeSettings, setIncludeSettings] = useState(false)
  const [restoreFavorites, setRestoreFavorites] = useState(false)
  const [restoreSettings, setRestoreSettings] = useState(false)
  const [canShare] = useState(() => !!navigator.share &&
    !!navigator.canShare?.({ files: [new File(['{}'], 'mi-dinero.json', { type: backupType })] }))
  const [preview, setPreview] = useState<{
    file: string, ledger: Ledger & BackupExtras, current: BackupSnapshot, months: string | null, changes: ReturnType<typeof compareEntries>,
  } | null>(null)

  useEffect(() => {
    if (cloudNotice) cloudSuccessRef.current?.scrollIntoView({ block: 'nearest' })
  }, [cloudNotice])

  function backupFile(snapshot: BackupSnapshot, beforeRestoring = false) {
    const prefix = beforeRestoring ? 'mi-dinero-antes-de-restaurar-' : 'mi-dinero-'
    const extras = {
      favorites: includeFavorites || (beforeRestoring && restoreFavorites) ? snapshot.favorites : undefined,
      settings: includeSettings || (beforeRestoring && restoreSettings) ? snapshot.settings : undefined,
    }
    return new File([JSON.stringify(makeBackup(snapshot, extras), null, 2)], prefix + calendarDay() + '.json', { type: backupType })
  }

  function recordExport(message = '') {
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
    try { await review(file.name, await file.text()) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se ha podido leer la copia.') }
    finally { setBusy(false) }
  }

  async function latestLedger() {
    try { return await readLedger() }
    catch (err) { throw new Error(storageMessage(err)) }
  }

  async function review(file: string, text: string) {
    const ledger = readBackup(text)
    const current = await latestLedger()
    setRestoreFavorites(false)
    setRestoreSettings(false)
    setPreview({ file, ledger, current, months: monthRange(ledger.entries), changes: compareEntries(current.entries, ledger.entries) })
  }

  async function runCloud(operation: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setCloudBusy(true)
    setError('')
    setNotice('')
    clearCloudFeedback()
    try { await operation() }
    catch (err) { setCloudError(err instanceof Error ? err.message : 'No se ha podido completar la operación en Dropbox.') }
    finally { setBusy(false); setCloudBusy(false) }
  }

  async function restore() {
    if (!preview || busy) return
    setBusy(true)
    setError('')
    try {
      await restoreLedger(preview.ledger, preview.current, {
        favorites: restoreFavorites ? preview.ledger.favorites : undefined,
        settings: restoreSettings ? preview.ledger.settings : undefined,
      })
      onRestored()
    }
    catch (err) { setError(storageMessage(err)); setBusy(false) }
  }

  async function uploadToDropbox(beforeRestoring = false) {
    const file = backupFile(await latestLedger(), beforeRestoring)
    const { rotation } = await uploadDropboxBackup(dropbox, file, beforeRestoring)
    recordExport()
    setCloudFiles(null)
    setCloudNotice(beforeRestoring
      ? 'Historial actual guardado en Dropbox.'
      : 'Copia subida a Dropbox.')
    setCloudWarning(!await rotation)
  }

  function clearCloudFeedback() {
    setCloudNotice('')
    setCloudWarning(false)
    setCloudError('')
  }

  const refundsCount = preview?.ledger.entries.reduce((total, entry) => total + (entry.refunds?.length ?? 0), 0) ?? 0

  function dismissPreview() { setPreview(null); setError(''); setNotice(''); clearCloudFeedback() }

  const cloudFeedback = <>
    {cloudBusy && !cloudNotice && <p className="export-notice" role="status">Procesando solicitud de Dropbox…</p>}
    {cloudNotice && <p ref={cloudSuccessRef} className="cloud-upload-success" role="status"><CircleCheck size={17} aria-hidden="true" />{cloudNotice}</p>}
    {cloudWarning && <p className="entry-hint" role="status">Quedaron copias antiguas en Dropbox. Mi Dinero volverá a intentar la limpieza en la próxima subida.</p>}
    {cloudError && <p className="form-error backup-feedback" role="alert">{cloudError}</p>}
  </>

  return <Modal title={preview ? 'Confirmar restauración' : 'Copias de seguridad'} onClose={onClose} onBack={preview ? dismissPreview : onBack} busy={busy}>
    {preview && <div className="confirm-panel">
      <div className="file-preview"><FileCheck2 size={23} /><strong>{preview.file}</strong></div>
      <p>La copia contiene <strong>{preview.ledger.entries.length} {preview.ledger.entries.length === 1 ? 'movimiento' : 'movimientos'}</strong>.
        Al restaurarla se reemplazará todo el historial de este dispositivo, que ahora contiene {preview.current.entries.length}.</p>
      <dl className="restore-comparison" aria-label="Cambios al restaurar">
        <div><dt>Se añadirán</dt><dd>{preview.changes.added}</dd></div>
        <div><dt>Se modificarán</dt><dd>{preview.changes.changed}</dd></div>
        <div className={preview.changes.removed ? 'restore-removals' : undefined}><dt>Se eliminarán</dt><dd>{preview.changes.removed}</dd></div>
      </dl>
      {preview.months && <p>Meses incluidos: <strong>{preview.months}</strong>.</p>}
      {refundsCount > 0 && <p>Reembolsos incluidos: <strong>{refundsCount}</strong>.</p>}
      <p>Saldo inicial del banco que se restaurará: <strong className="money">{money(preview.ledger.openingCents)}</strong>.
        {preview.ledger.openingCents !== preview.current.openingCents && <> Saldo inicial actual: <strong className="money">{money(preview.current.openingCents)}</strong>.</>}</p>
      {preview.ledger.reminders && <p>Recordatorios que se restaurarán: <strong>{preview.ledger.reminders.length}</strong>.</p>}
      {preview.ledger.entries.length === 0 && <p className="form-error">Esta copia dejará tu historial vacío.</p>}
      {(preview.ledger.favorites || preview.ledger.settings) && <fieldset className="backup-extras">
        <legend>Restaurar también</legend>
        {preview.ledger.favorites && <label><input type="checkbox" checked={restoreFavorites} disabled={busy}
          onChange={event => setRestoreFavorites(event.target.checked)} />Restaurar favoritos ({preview.ledger.favorites.length})</label>}
        {preview.ledger.settings && <label><input type="checkbox" checked={restoreSettings} disabled={busy}
          onChange={event => setRestoreSettings(event.target.checked)} />Restaurar ajustes</label>}
        <p className="entry-hint">Las opciones marcadas reemplazan las de este dispositivo.</p>
      </fieldset>}
      {(preview.current.entries.length > 0 || preview.current.openingCents !== 0 || !!preview.current.reminders?.length || restoreFavorites || restoreSettings) &&
        <div className="backup-actions save-before-restore">
          {dropbox.refreshToken && <button className="secondary" disabled={busy} onClick={() => runCloud(() => uploadToDropbox(true))}>
            <CloudUpload size={16} />Guardar mi historial actual en Dropbox
          </button>}
          <button className="secondary" disabled={busy} onClick={() => download(true)}>
            <Download size={16} />Descargar copia del historial actual
          </button>
        </div>}
      {cloudFeedback}
      <div className="action-row">
        <button className="secondary" disabled={busy} onClick={dismissPreview}>Cancelar</button>
        <button className="primary" disabled={busy} onClick={restore}>{busy && !cloudBusy ? 'Restaurando…' : 'Restaurar copia'}</button>
      </div>
    </div>}
    <div hidden={!!preview}><div className="backup-options">
      <p className="local-note"><HardDrive size={19} />Tus movimientos se guardan en este dispositivo. Conserva una copia para recuperarlos o llevarlos a otro dispositivo.</p>
      <fieldset className="backup-extras">
        <legend>Incluir al crear una copia</legend>
        <label><input type="checkbox" checked={includeFavorites} disabled={busy} onChange={event => setIncludeFavorites(event.target.checked)} />Incluir favoritos</label>
        <label><input type="checkbox" checked={includeSettings} disabled={busy} onChange={event => setIncludeSettings(event.target.checked)} />Incluir ajustes de tema, diseño y mes de inicio</label>
      </fieldset>
      <CloudBackups settings={dropbox} onSettings={setDropbox} busy={busy} run={runCloud} files={cloudFiles}
        onFiles={setCloudFiles} review={review} onUpload={uploadToDropbox} feedback={!preview && cloudFeedback} />
      <div className="backup-option"><span className="utility-icon"><Download size={21} /></span>
        <div><h3>Exportar copia</h3><p>Guarda tus movimientos, saldo inicial y recordatorios en un archivo JSON.</p>
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
    </div></div>
    {error && <p className="form-error backup-feedback" role="alert">{error}</p>}
    {notice && <p className="export-notice" role="status">{notice}</p>}
  </Modal>
}
