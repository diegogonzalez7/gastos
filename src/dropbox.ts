const settingsKey = 'mi-dinero:dropbox'
const scopes = 'files.metadata.read files.content.read files.content.write'
const tokenUrl = 'https://api.dropboxapi.com/oauth2/token'
const apiUrl = 'https://api.dropboxapi.com/2/files/'
const contentUrl = 'https://content.dropboxapi.com/2/files/'
const generatedBackupName = /^mi-dinero-(?:antes-de-restaurar-)?(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:\.\d{3})?)Z-[a-f0-9]{8}(?: \(\d+\))?\.json$/i
export const dropboxBackupLimit = 5

export type DropboxSettings = {
  appKey: string
  refreshToken?: string
  pending?: { verifier: string, challenge: string, expiresAt: number }
}

export type CloudBackup = { id: string, name: string, server_modified: string, rev: string }

export function savedDropbox(): DropboxSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey) ?? 'null')
    if (typeof saved?.appKey === 'string') return saved
  } catch { /* Connecting is optional. */ }
  return { appKey: '' }
}

export function saveDropbox(settings: DropboxSettings) {
  try { localStorage.setItem(settingsKey, JSON.stringify(settings)) }
  catch { throw new Error('El navegador no permite guardar la conexión con Dropbox.') }
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export async function prepareDropbox(appKey: string): Promise<DropboxSettings> {
  const key = appKey.trim()
  if (!/^[\w-]{6,80}$/.test(key)) throw new Error('Introduce la clave de aplicación (App key) de Dropbox.')
  if (!crypto.subtle) throw new Error('Abre Mi Dinero por HTTPS para conectar con Dropbox.')
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { appKey: key, pending: { verifier, challenge: base64url(new Uint8Array(hash)), expiresAt: Date.now() + 15 * 60_000 } }
}

export function dropboxAuthorization(settings: DropboxSettings) {
  if (!settings.pending || Date.now() >= settings.pending.expiresAt) return null
  const url = new URL('https://www.dropbox.com/oauth2/authorize')
  url.search = new URLSearchParams({
    client_id: settings.appKey, response_type: 'code', token_access_type: 'offline',
    scope: scopes, code_challenge: settings.pending.challenge, code_challenge_method: 'S256',
  }).toString()
  return url.href
}

async function request(url: string, options: RequestInit) {
  try {
    return await fetch(url, { ...options, method: 'POST', signal: AbortSignal.timeout(30_000), referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error('No se ha podido conectar con Dropbox. Comprueba la conexión e inténtalo de nuevo.')
  }
}

async function tokens(appKey: string, params: Record<string, string>) {
  const response = await request(tokenUrl, { body: new URLSearchParams({ client_id: appKey, ...params }) })
  if (response.status === 400 || response.status === 401) {
    throw new Error(params.grant_type === 'authorization_code'
      ? 'Dropbox no ha aceptado el código. Revisa la App key y los permisos, o vuelve a iniciar la conexión para obtener otro código.'
      : 'Dropbox ya no acepta esta conexión. Pulsa Desconectar y vuelve a conectar la cuenta.')
  }
  if (!response.ok) throw new Error('Dropbox no ha podido iniciar sesión. Inténtalo de nuevo más tarde.')
  return await response.json() as { access_token?: string, refresh_token?: string }
}

export async function connectDropbox(settings: DropboxSettings, code: string): Promise<DropboxSettings> {
  if (!settings.pending || Date.now() >= settings.pending.expiresAt) {
    throw new Error('El código ha caducado. Vuelve a iniciar la conexión desde Mi Dinero.')
  }
  const token = await tokens(settings.appKey, {
    grant_type: 'authorization_code', code: code.trim(), code_verifier: settings.pending.verifier,
  })
  if (!token.refresh_token) throw new Error('Dropbox no ha devuelto una conexión válida. Vuelve a conectar la cuenta.')
  return { appKey: settings.appKey, refreshToken: token.refresh_token }
}

async function accessToken(settings: DropboxSettings) {
  if (!settings.refreshToken) throw new Error('Conecta tu cuenta de Dropbox para ver las copias.')
  const token = await tokens(settings.appKey, { grant_type: 'refresh_token', refresh_token: settings.refreshToken })
  if (!token.access_token) throw new Error('No se ha podido renovar la conexión con Dropbox.')
  return token.access_token
}

async function filesRequest(url: string, token: string, options: RequestInit, allowConflict = false) {
  const headers = new Headers(options.headers)
  headers.set('Authorization', 'Bearer ' + token)
  const response = await request(url, { ...options, headers })
  if (response.status === 401) throw new Error('Dropbox ha rechazado la conexión. Revisa los permisos o vuelve a conectar la cuenta.')
  if (response.status === 403) throw new Error('Dropbox ha denegado el acceso. Revisa los permisos y el espacio disponible en tu cuenta.')
  if (response.status === 429) throw new Error('Dropbox ha limitado las solicitudes. Espera un momento y vuelve a intentarlo.')
  if (allowConflict && response.status === 409) return response
  if (!response.ok) throw new Error('Dropbox no ha podido completar la operación. Actualiza la lista o vuelve a intentarlo.')
  return response
}

function newestFirst(a: CloudBackup, b: CloudBackup) {
  // Dropbox reports modification times to the second. The name breaks ties across devices.
  return b.server_modified.localeCompare(a.server_modified) ||
    (generatedBackupName.exec(b.name)?.[1] ?? '').localeCompare(generatedBackupName.exec(a.name)?.[1] ?? '') ||
    b.id.localeCompare(a.id)
}

async function listBackups(token: string) {
  const entries = new Map<string, CloudBackup>()
  let cursor: string | undefined
  do {
    const response = await filesRequest(apiUrl + (cursor ? 'list_folder/continue' : 'list_folder'), token, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cursor ? { cursor } : { path: '', limit: 100 }),
    })
    const page: { entries: (CloudBackup & { '.tag': string })[], has_more: boolean, cursor: string } = await response.json()
    for (const entry of page.entries) {
      if (entry['.tag'] === 'file' && /^mi-dinero-.+\.json$/i.test(entry.name)) entries.set(entry.id, entry)
    }
    cursor = page.has_more ? page.cursor : undefined
  } while (cursor)
  return entries
}

export async function listDropboxBackups(settings: DropboxSettings): Promise<CloudBackup[]> {
  return Array.from((await listBackups(await accessToken(settings))).values()).sort(newestFirst)
}

async function rotateBackups(token: string, uploaded: CloudBackup) {
  if (!uploaded.id?.startsWith('id:') || !generatedBackupName.test(uploaded.name) || !uploaded.server_modified) {
    throw new Error('Dropbox no ha devuelto los datos de la copia subida.')
  }
  const copies = await listBackups(token)
  // A folder listing may not show the new upload yet.
  if (!copies.has(uploaded.id)) copies.set(uploaded.id, uploaded)
  const oldest = Array.from(copies.values())
    .filter(copy => generatedBackupName.test(copy.name)).sort(newestFirst).slice(dropboxBackupLimit).reverse()
  for (const copy of oldest) {
    if (!copy.id.startsWith('id:') || !copy.rev) throw new Error('No se ha podido identificar la copia anterior.')
    const response = await filesRequest(apiUrl + 'delete_v2', token, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: copy.id, parent_rev: copy.rev }),
    }, true)
    if (response.status === 409) {
      const { error } = await response.json()
      if (error?.['.tag'] === 'path_lookup' && error.path_lookup?.['.tag'] === 'not_found') continue
      throw new Error('Dropbox no ha podido borrar una copia anterior.')
    }
  }
}

export async function uploadDropboxBackup(settings: DropboxSettings, file: Blob, beforeRestoring = false) {
  const stamp = new Date().toISOString().replaceAll(':', '-')
  const prefix = beforeRestoring ? 'mi-dinero-antes-de-restaurar-' : 'mi-dinero-'
  const name = `${prefix}${stamp}-${crypto.randomUUID().slice(0, 8)}.json`
  const token = await accessToken(settings)
  const response = await filesRequest(contentUrl + 'upload', token, {
    headers: { 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify({ path: '/' + name, mode: 'add', autorename: true }) },
    body: file,
  })
  const rotation = response.json().then(uploaded => rotateBackups(token, uploaded)).then(() => true, () => false)
  return { rotation }
}

export async function downloadDropboxBackup(settings: DropboxSettings, backup: CloudBackup) {
  const response = await filesRequest(contentUrl + 'download', await accessToken(settings), {
    headers: { 'Dropbox-API-Arg': JSON.stringify({ path: backup.id }) },
  })
  return await response.text()
}
