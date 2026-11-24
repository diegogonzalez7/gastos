import { readReminders, type Reminder } from './reminders.ts'

export type Kind = 'expense' | 'income' | 'withdrawal'
export type PaymentSource = 'cash' | 'bank'

export const categories = {
  food: { name: 'Alimentación', kind: 'expense', color: '#f0a451' },
  transport: { name: 'Transporte', kind: 'expense', color: '#689ccf' },
  leisure: { name: 'Ocio', kind: 'expense', color: '#a18bd0' },
  home: { name: 'Hogar', kind: 'expense', color: '#57a897' },
  health: { name: 'Salud', kind: 'expense', color: '#d47b86' },
  shopping: { name: 'Compras', kind: 'expense', color: '#bf8f68' },
  travel: { name: 'Viajes', kind: 'expense', color: '#6ba7b8' },
  education: { name: 'Educación', kind: 'expense', color: '#99aa63' },
  otherExpense: { name: 'Otro', kind: 'expense', color: '#8998a2' },
  supermarket: { name: 'Supermercado', kind: 'expense', color: '#85a458' },
  meal: { name: 'Comida', kind: 'expense', color: '#ca7750' },
  machine: { name: 'Máquina Trabajo', kind: 'expense', color: '#ba8759' },
  clothes: { name: 'Ropa', kind: 'expense', color: '#c285ac' },
  hair: { name: 'Peluquería', kind: 'expense', color: '#bb91bf' },
  vet: { name: 'Veterinario', kind: 'expense', color: '#7a9fb3' },
  spotify: { name: 'Spotify', kind: 'expense', color: '#56a969' },
  giftExpense: { name: 'Regalo', kind: 'expense', color: '#bc879d' },
  bet: { name: 'Bet365', kind: 'expense', color: '#599778' },
  quiniela: { name: 'Quiniela', kind: 'expense', color: '#b1965e' },
  betIncome: { name: 'Bet365', kind: 'income', color: '#599778' },
  quinielaIncome: { name: 'Quiniela', kind: 'income', color: '#b1965e' },
  salary: { name: 'Nómina', kind: 'income', color: '#55a889' },
  freelance: { name: 'Trabajo independiente', kind: 'income', color: '#639bb5' },
  gift: { name: 'Regalo', kind: 'income', color: '#b78cc5' },
  otherIncome: { name: 'Otro', kind: 'income', color: '#879f93' },
  withdrawal: { name: 'Retirada de efectivo', kind: 'withdrawal', color: '#7a9fb3' },
} as const

export type CategoryId = keyof typeof categories
export const categoryIds: CategoryId[] = [
  'food', 'transport', 'machine', 'clothes', 'hair', 'vet', 'meal', 'spotify',
  'giftExpense', 'bet', 'quiniela', 'otherExpense',
  'salary', 'betIncome', 'quinielaIncome', 'gift', 'otherIncome',
]

// Keep historical categories readable and combine existing supermarket entries with food.
export function displayCategory(category: CategoryId): CategoryId {
  return category === 'supermarket' ? 'food' : category
}

export interface Entry {
  id: string
  kind: Kind
  cents: number
  category: CategoryId
  concept: string
  date: string
  createdAt: number
  payment?: PaymentSource
}

export function paymentSource({ category, payment }: Pick<Entry, 'category' | 'payment'>): PaymentSource {
  return category === 'machine' || (categories[category].kind === 'expense' && payment === 'cash') ? 'cash' : 'bank'
}

export function newEntryId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // getRandomValues also works on a phone connected to an HTTP development server.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

export const MAX_CENTS = 99_999_999_999
export const MAX_CONCEPT = 120
export const currency = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', useGrouping: 'always',
})
export const money = (cents: number) => currency.format(cents / 100).replace(/\s+€$/, '\u202f€')

const percentFormat = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 0 })
export const percent = (fraction: number) => fraction > 0 && fraction < 0.01 ? '<1 %' : percentFormat.format(fraction)

function unsignedCents(input: string): number | null {
  let value = input.trim()
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(value)) value = value.replaceAll('.', '')
  if (!/^(?:\d+([.,]\d{1,2})?|[.,]\d{1,2})$/.test(value)) return null
  const [whole, fraction = ''] = value.split(/[.,]/)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents <= MAX_CENTS ? cents : null
}

export function parseAmount(input: string): number | null {
  return unsignedCents(input) || null
}

export function parseOpening(input: string): number | null {
  const value = input.trim()
  const negative = value.startsWith('-')
  const cents = unsignedCents(negative ? value.slice(1) : value)
  return cents === null ? null : negative ? -cents : cents
}

export interface Ledger {
  entries: Entry[]
  openingCents: number
  reminders?: Reminder[]
}

export function accountBalances({ entries, openingCents }: Ledger, month: string) {
  let closing = openingCents
  let total = openingCents
  for (const entry of entries) {
    if (paymentSource(entry) === 'cash') continue
    const signed = entry.kind === 'income' ? entry.cents : -entry.cents
    total += signed
    if (entry.date.slice(0, 7) <= month) closing += signed
  }
  return { closing, total }
}

export function calendarDay(date = new Date()): string {
  return [String(date.getFullYear()).padStart(4, '0'), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
}

function pad(number: number) { return String(number).padStart(2, '0') }

export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const index = Math.max(0, Math.min(9999 * 12 - 1, (y - 1) * 12 + m - 1 + delta))
  return String(Math.floor(index / 12) + 1).padStart(4, '0') + '-' + pad(index % 12 + 1)
}

export function dateLabel(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(day + 'T12:00:00').toLocaleDateString('es-ES', options)
}

export const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
export const monthLabel = (month: string) =>
  capitalize(dateLabel(month + '-01', { month: 'long', year: 'numeric' }))

export function monthly(entries: Entry[], month: string) {
  return entries.filter(entry => entry.date.slice(0, 7) === month)
}

export function latestFirst(entries: Entry[]) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt || a.id.localeCompare(b.id))
}

export function summarize(entries: Entry[]) {
  let income = 0
  let expense = 0
  const amounts = new Map<CategoryId, number>()
  for (const entry of entries) {
    if (entry.kind === 'income') {
      income += entry.cents
    } else if (entry.kind === 'expense') {
      expense += entry.cents
      const category = displayCategory(entry.category)
      amounts.set(category, (amounts.get(category) ?? 0) + entry.cents)
    }
  }
  const breakdown = [...amounts].sort((a, b) => b[1] - a[1])
    .map(([category, cents]) => ({ category, cents, share: cents / expense }))
  return { income, expense, balance: income - expense, breakdown }
}

export type Summary = ReturnType<typeof summarize>

export function searchText(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readEntry(value: unknown, version: number): Entry {
  if (!record(value)) throw new Error('La copia contiene un movimiento ilegible.')
  const { id, kind, cents, category, concept, date, createdAt, payment } = value
  if (typeof id !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)
      || (kind !== 'income' && kind !== 'expense' && !(version === 3 && kind === 'withdrawal'))
      || typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS
      || typeof category !== 'string' || !Object.hasOwn(categories, category)
      || categories[category as CategoryId].kind !== kind
      || (payment !== undefined && (kind !== 'expense' || (payment !== 'cash' && payment !== 'bank')))
      || typeof concept !== 'string' || concept.length > MAX_CONCEPT
      || !validDay(date) || typeof createdAt !== 'number' || !Number.isSafeInteger(createdAt) || createdAt < 0) {
    throw new Error('La copia contiene un movimiento con datos no válidos.')
  }
  const entry: Entry = { id: id.toLowerCase(), kind, cents, category: category as CategoryId, concept: concept.trim(), date, createdAt }
  return payment === undefined ? entry : { ...entry, payment: paymentSource({ ...entry, payment }) }
}

export function makeBackup({ entries, openingCents, reminders }: Ledger) {
  const transactions = entries.map(entry => entry.kind === 'expense' ? { ...entry, payment: paymentSource(entry) } : entry)
  return { app: 'mi-dinero', version: 3, currency: 'EUR', openingCents, exportedAt: new Date().toISOString(), transactions, reminders }
}

export function readBackup(text: string): Ledger {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('El archivo no contiene JSON válido.') }
  if (!record(data) || data.app !== 'mi-dinero') throw new Error('Selecciona una copia creada con Mi Dinero.')
  const { version } = data
  if ((version !== 1 && version !== 2 && version !== 3) || data.currency !== 'EUR') throw new Error('La versión o la moneda de esta copia es incompatible.')
  if (!Array.isArray(data.transactions)) throw new Error('Falta la lista de movimientos en la copia.')
  const entries = data.transactions.map(value => readEntry(value, version))
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('La copia contiene movimientos duplicados.')
  const openingCents = data.version === 1 ? 0 : data.openingCents
  if (typeof openingCents !== 'number' || !Number.isSafeInteger(openingCents) || Math.abs(openingCents) > MAX_CENTS) {
    throw new Error('La copia contiene un saldo inicial no válido.')
  }
  if (data.reminders === undefined) return { entries, openingCents }
  return { entries, openingCents, reminders: readReminders(data.reminders) }
}

export function equalEntry(a: Entry | undefined, b: Entry) {
  return a?.id === b.id && a.kind === b.kind && a.cents === b.cents && a.category === b.category &&
    a.concept === b.concept && a.date === b.date && a.createdAt === b.createdAt && paymentSource(a) === paymentSource(b)
}

export function compareEntries(current: Entry[], incoming: Entry[]) {
  const remaining = new Map(current.map(entry => [entry.id, entry]))
  let added = 0
  let changed = 0
  for (const entry of incoming) {
    const previous = remaining.get(entry.id)
    if (!previous) added++
    else if (!equalEntry(previous, entry)) changed++
    remaining.delete(entry.id)
  }
  return { added, changed, removed: remaining.size }
}
