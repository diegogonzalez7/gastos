import { useState, type FormEvent } from 'react'
import { Cloud, CloudDownload, CloudUpload, ExternalLink, Search } from 'lucide-react'
import {
  connectDropbox, downloadDropboxBackup, dropboxAuthorization, listDropboxBackups, prepareDropbox,
  saveDropbox, uploadDropboxBackup, type CloudBackup, type DropboxSettings,
} from '../dropbox'

const backupDate = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'medium' })

export function CloudBackups({ settings, onSettings, busy, run, makeFile, review, onUploaded }: {
  settings: DropboxSettings, onSettings: (settings: DropboxSettings) => void,
  busy: boolean, run: (operation: () => Promise<void>) => void, makeFile: () => Promise<File>,
  review: (file: string, text: string) => Promise<void>, onUploaded: () => void,
}) {
  const authorization = dropboxAuthorization(settings)
  const [showSetup, setShowSetup] = useState(!!settings.pending)
  const [appKey, setAppKey] = useState(settings.appKey)
  const [code, setCode] = useState('')
  const [files, setFiles] = useState<CloudBackup[] | null>(null)

  function remember(next: DropboxSettings) {
    saveDropbox(next)
    onSettings(next)
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    run(async () => remember(await prepareDropbox(appKey)))
  }

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    run(async () => {
      remember(await connectDropbox(settings, code))
      setCode('')
      setShowSetup(false)
    })
  }

  return <div className="backup-option cloud-backup"><span className="utility-icon"><Cloud size={21} /></span>
    <div>
      <h3>Copias en Dropbox</h3>
      {settings.refreshToken ? <>
        <p>Sube una copia de este dispositivo o busca las guardadas con la misma cuenta.</p>
        <div className="backup-actions">
          <button className="secondary" disabled={busy} onClick={() => run(async () => {
            await uploadDropboxBackup(settings, await makeFile())
            setFiles(null)
            onUploaded()
          })}><CloudUpload size={16} />Subir copia a la nube</button>
          <button className="secondary" disabled={busy} onClick={() => run(async () => {
            setFiles(await listDropboxBackups(settings))
          })}><Search size={16} />Buscar copias en la nube</button>
        </div>
        {files?.length === 0 && <p className="cloud-backup-empty" role="status">Todavía no hay copias guardadas en esta carpeta de Dropbox.</p>}
        {!!files?.length && <ul className="cloud-backup-list" aria-label="Copias guardadas en Dropbox">
          {files.map(file => <li key={file.id}><button className="secondary" disabled={busy}
            onClick={() => run(async () => review(file.name, await downloadDropboxBackup(settings, file)))}>
            <CloudDownload size={17} /><span><strong>{backupDate.format(new Date(file.server_modified))}</strong><small>{file.name}</small></span>
          </button></li>)}
        </ul>}
        <button className="cloud-disconnect" disabled={busy} onClick={() => run(async () => {
          remember({ appKey: settings.appKey })
          setFiles(null)
        })}>Desconectar Dropbox en este dispositivo</button>
      </> : <>
        <p>Usa la misma cuenta en el iPhone y en el ordenador. Las copias se guardan en la carpeta privada de la aplicación.</p>
        {!showSetup ? <button className="secondary" disabled={busy} onClick={() => setShowSetup(true)}>Conectar con Dropbox</button>
          : authorization ? <form className="cloud-setup" onSubmit={connect}>
            <a className="secondary" href={authorization} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Abrir Dropbox</a>
            <p>Autoriza la conexión, copia el código que te muestra Dropbox y vuelve a Mi Dinero para pegarlo aquí.</p>
            <label className="field">Código de Dropbox
              <input type="text" value={code} onChange={event => setCode(event.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} required disabled={busy} />
            </label>
            <div className="backup-actions">
              <button className="primary" disabled={busy || !code.trim()} type="submit">Conectar cuenta</button>
              <button className="secondary" disabled={busy} type="button" onClick={() => run(async () => {
                remember({ appKey: settings.appKey })
                setCode('')
              })}>Volver</button>
            </div>
          </form> : <form className="cloud-setup" onSubmit={prepare}>
            <p>Crea una aplicación de tipo <strong>App folder</strong> en la <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer">consola de Dropbox</a> y usa su <strong>App key</strong> en cada dispositivo.</p>
            <details>
              <summary>Permisos de la aplicación</summary>
              <p>En <strong>Permissions</strong>, activa <code>files.metadata.read</code>, <code>files.content.read</code> y <code>files.content.write</code>. Pulsa <strong>Submit</strong> para guardar y copia la <strong>App key</strong> de <strong>Settings</strong>.</p>
            </details>
            <label className="field">App key de Dropbox
              <input type="text" value={appKey} onChange={event => setAppKey(event.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} required disabled={busy} />
            </label>
            <div className="backup-actions">
              <button className="primary" disabled={busy || !appKey.trim()} type="submit">Continuar</button>
              <button className="secondary" disabled={busy} type="button" onClick={() => setShowSetup(false)}>Cancelar conexión</button>
            </div>
          </form>}
      </>}
    </div>
  </div>
}
