export type Kind = 'expense' | 'income'

export const categories = {
  food: { name: 'Alimentación', kind: 'expense', color: '#f0a451' },
  transport: { name: 'Transporte', kind: 'expense', color: '#689ccf' },
  leisure: { name: 'Ocio', kind: 'expense', color: '#a18bd0' },
  home: { name: 'Hogar', kind: 'expense', color: '#57a897' },
  health: { name: 'Salud', kind: 'expense', color: '#d47b86' },
  shopping: { name: 'Compras', kind: 'expense', color: '#bf8f68' },
  travel: { name: 'Viajes', kind: 'expense', color: '#6ba7b8' },
  education: { name: 'Educación', kind: 'expense', color: '#99aa63' },
  otherExpense: { name: 'Otros gastos', kind: 'expense', color: '#8998a2' },
  salary: { name: 'Nómina', kind: 'income', color: '#55a889' },
  freelance: { name: 'Trabajo independiente', kind: 'income', color: '#639bb5' },
  gift: { name: 'Regalos', kind: 'income', color: '#b78cc5' },
  otherIncome: { name: 'Otros ingresos', kind: 'income', color: '#879f93' },
} as const

export type CategoryId = keyof typeof categories
export const categoryIds = Object.keys(categories) as CategoryId[]

export interface Entry {
  id: string
  kind: Kind
  cents: number
  category: CategoryId
  concept: string
  date: string
  createdAt: number
}

export const MAX_CENTS = 99_999_999_999
export const MAX_CONCEPT = 120
export const currency = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', useGrouping: 'always',
})
export const money = (cents: number) => currency.format(cents / 100)

export function parseAmount(input: string): number | null {
  let value = input.trim()
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(value)) value = value.replaceAll('.', '')
  if (!/^(?:\d+([.,]\d{1,2})?|[.,]\d{1,2})$/.test(value)) return null
  const [whole, fraction = ''] = value.split(/[.,]/)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_CENTS ? cents : null
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
    } else {
      expense += entry.cents
      amounts.set(entry.category, (amounts.get(entry.category) ?? 0) + entry.cents)
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

function readEntry(value: unknown): Entry {
  if (!record(value)) throw new Error('La copia contiene un movimiento ilegible.')
  const { id, kind, cents, category, concept, date, createdAt } = value
  if (typeof id !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)
      || (kind !== 'income' && kind !== 'expense')
      || typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS
      || typeof category !== 'string' || !Object.hasOwn(categories, category)
      || categories[category as CategoryId].kind !== kind
      || typeof concept !== 'string' || !concept.trim() || concept.length > MAX_CONCEPT
      || !validDay(date) || typeof createdAt !== 'number' || !Number.isSafeInteger(createdAt) || createdAt < 0) {
    throw new Error('La copia contiene un movimiento con datos no válidos.')
  }
  return { id, kind, cents, category: category as CategoryId, concept: concept.trim(), date, createdAt }
}

export function makeBackup(transactions: Entry[]) {
  return { app: 'mi-dinero', version: 1, currency: 'EUR', exportedAt: new Date().toISOString(), transactions }
}

export function readBackup(text: string): Entry[] {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('El archivo no contiene JSON válido.') }
  if (!record(data) || data.app !== 'mi-dinero') throw new Error('Selecciona una copia creada con Mi Dinero.')
  if (data.version !== 1 || data.currency !== 'EUR') throw new Error('La versión o la moneda de esta copia es incompatible.')
  if (!Array.isArray(data.transactions)) throw new Error('Falta la lista de movimientos en la copia.')
  const entries = data.transactions.map(readEntry)
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('La copia contiene movimientos duplicados.')
  return entries
}

export function equalEntry(a: Entry | undefined, b: Entry) {
  return a?.id === b.id && a.kind === b.kind && a.cents === b.cents && a.category === b.category &&
    a.concept === b.concept && a.date === b.date && a.createdAt === b.createdAt
}
