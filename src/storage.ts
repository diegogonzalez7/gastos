import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { calendarDay, equalEntry, newEntryId, validMonth, type Entry, type Ledger } from './ledger'
import { sameReminder, type Reminder } from './reminders'

interface LedgerDB extends DBSchema {
  settings: { key: 'openingCents' | 'historyStart', value: number | string }
  entries: { key: string, value: Entry }
  reminders: { key: string, value: Reminder }
}

let connection: Promise<IDBPDatabase<LedgerDB>> | undefined
function database() {
  if (!connection) {
    connection = openDB<LedgerDB>('mi-dinero', 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) db.createObjectStore('entries', { keyPath: 'id' })
        if (oldVersion < 2) {
          const settings = db.createObjectStore('settings')
          if (oldVersion === 0) void settings.put(calendarDay().slice(0, 4) + '-01', 'historyStart')
        }
        if (oldVersion < 3) db.createObjectStore('reminders', { keyPath: 'id' })
      },
      blocking(_old, _new, event) {
        (event.target as IDBDatabase).close()
        connection = undefined
      },
      terminated() { connection = undefined },
    }).catch(error => { connection = undefined; throw error })
  }
  return connection
}

export async function readLedger(): Promise<Ledger & { reminders: Reminder[], historyStart: string }> {
  const tx = (await database()).transaction(['entries', 'settings', 'reminders'])
  const settings = tx.objectStore('settings')
  const [entries, opening, reminders, start] = await Promise.all([
    tx.objectStore('entries').getAll(), settings.get('openingCents'), tx.objectStore('reminders').getAll(), settings.get('historyStart'),
  ])
  return { entries, openingCents: typeof opening === 'number' ? opening : 0, reminders, historyStart: validMonth(start) ? start : '2026-09' }
}

export async function saveHistoryStart(month: string) {
  await (await database()).put('settings', month, 'historyStart')
  notifyReaders()
}

export async function saveOpening(openingCents: number, original: number) {
  const tx = (await database()).transaction('settings', 'readwrite')
  if (((await tx.store.get('openingCents')) ?? 0) !== original) throw new ChangedDataError()
  await Promise.all([tx.store.put(openingCents, 'openingCents'), tx.done])
  notifyReaders()
}

const changeKey = 'mi-dinero:changes'
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(changeKey) : null

function notifyReaders() {
  if (channel) channel.postMessage('change')
  else {
    try { localStorage.setItem(changeKey, newEntryId()) } catch { /* Refresh also runs when a tab becomes visible. */ }
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

export async function saveReminder(reminder: Reminder) {
  await (await database()).add('reminders', reminder)
  notifyReaders()
}

export async function changeReminder(original: Reminder, replacement: Reminder | null) {
  const tx = (await database()).transaction('reminders', 'readwrite')
  try {
    if (!sameReminder(await tx.store.get(original.id), original)) throw new ChangedDataError()
    if (replacement) await tx.store.put(replacement)
    else await tx.store.delete(original.id)
    await tx.done
  } catch (error) {
    await tx.done.catch(() => {})
    throw error
  }
  notifyReaders()
}

export async function restoreLedger(ledger: Ledger, expected: Ledger) {
  const tx = (await database()).transaction(['entries', 'settings', 'reminders'], 'readwrite')
  const store = tx.objectStore('entries')
  const settings = tx.objectStore('settings')
  const reminders = tx.objectStore('reminders')
  try {
    const current = await store.getAll()
    if (((await settings.get('openingCents')) ?? 0) !== expected.openingCents) throw new ChangedDataError()
    const byId = new Map(expected.entries.map(entry => [entry.id, entry]))
    if (current.length !== expected.entries.length || current.some(entry => !equalEntry(byId.get(entry.id), entry))) {
      throw new ChangedDataError()
    }
    if (ledger.reminders) {
      const existing = await reminders.getAll()
      const byId = new Map(expected.reminders?.map(reminder => [reminder.id, reminder]))
      if (existing.length !== byId.size || existing.some(reminder => !sameReminder(byId.get(reminder.id), reminder))) {
        throw new ChangedDataError()
      }
      await reminders.clear()
      await Promise.all(ledger.reminders.map(reminder => reminders.add(reminder)))
    }
    await store.clear()
    await settings.put(ledger.openingCents, 'openingCents')
    await Promise.all([...ledger.entries.map(entry => store.add(entry)), tx.done])
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
