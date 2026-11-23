import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { equalEntry, type Entry } from './ledger'

interface LedgerDB extends DBSchema {
  entries: { key: string, value: Entry }
}

let connection: Promise<IDBPDatabase<LedgerDB>> | undefined
function database() {
  if (!connection) {
    connection = openDB<LedgerDB>('mi-dinero', 1, {
      upgrade(db) { db.createObjectStore('entries', { keyPath: 'id' }) },
      blocking(_old, _new, event) {
        (event.target as IDBDatabase).close()
        connection = undefined
      },
      terminated() { connection = undefined },
    }).catch(error => { connection = undefined; throw error })
  }
  return connection
}

export async function allEntries() {
  return (await database()).getAll('entries')
}

const changeKey = 'mi-dinero:changes'
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(changeKey) : null

function notifyReaders() {
  if (channel) channel.postMessage('change')
  else {
    try { localStorage.setItem(changeKey, crypto.randomUUID()) } catch { /* Refresh also runs when a tab becomes visible. */ }
  }
}

export function watchEntries(refresh: () => void) {
  const onVisible = () => { if (!document.hidden) refresh() }
  const onStorage = (event: StorageEvent) => { if (event.key === changeKey) refresh() }
  channel?.addEventListener('message', refresh)
  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    channel?.removeEventListener('message', refresh)
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

export class ChangedDataError extends Error {
  constructor() { super('Los datos han cambiado en otra ventana. Cierra este panel y vuelve a intentarlo con los datos actualizados.') }
}

export async function saveEntry(entry: Entry) {
  await (await database()).add('entries', entry)
  notifyReaders()
}

export async function changeEntry(original: Entry, replacement: Entry | null) {
  const tx = (await database()).transaction('entries', 'readwrite')
  try {
    if (!equalEntry(await tx.store.get(original.id), original)) throw new ChangedDataError()
    if (replacement) await tx.store.put(replacement)
    else await tx.store.delete(original.id)
    await tx.done
  } catch (error) {
    await tx.done.catch(() => {})
    throw error
  }
  notifyReaders()
}

export async function restoreEntries(entries: Entry[], expected: Entry[]) {
  const tx = (await database()).transaction('entries', 'readwrite')
  try {
    const current = await tx.store.getAll()
    const byId = new Map(expected.map(entry => [entry.id, entry]))
    if (current.length !== expected.length || current.some(entry => !equalEntry(byId.get(entry.id), entry))) {
      throw new ChangedDataError()
    }
    await tx.store.clear()
    await Promise.all([...entries.map(entry => tx.store.add(entry)), tx.done])
  } catch (error) {
    try { tx.abort() } catch { /* The failing request may already have aborted the transaction. */ }
    await tx.done.catch(() => {})
    throw error
  }
  notifyReaders()
}

export function storageMessage(error: unknown) {
  if (error instanceof ChangedDataError) return error.message
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'El dispositivo se ha quedado sin espacio. Libera espacio y vuelve a intentarlo.'
  }
  return 'No se pudo acceder al almacenamiento local. Comprueba los permisos del navegador y vuelve a intentarlo.'
}
