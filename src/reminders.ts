export interface Reminder {
  id: string
  title: string
  at: number
  paid: boolean
}

export const reminderTitleLimit = 120
const lastReminderTime = Date.UTC(9999, 11, 31, 23, 59)

export function reminderInput(at: number): string {
  const local = new Date(at)
  const pad = (value: number) => String(value).padStart(2, '0')
  return String(local.getFullYear()).padStart(4, '0') + '-' + pad(local.getMonth() + 1) + '-' + pad(local.getDate()) +
    'T' + pad(local.getHours()) + ':' + pad(local.getMinutes())
}

export function parseReminderTime(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const at = new Date(value).getTime()
  return validTimestamp(at) && reminderInput(at) === value ? at : null
}

export const reminderDate = (at: number) => new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long', timeStyle: 'short',
}).format(at)

function validTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= lastReminderTime
}

export function readReminders(value: unknown): Reminder[] {
  if (!Array.isArray(value)) throw new Error('La lista de recordatorios de la copia no es válida.')
  const ids = new Set<string>()
  return value.map(item => {
    const id = typeof item?.id === 'string' ? item.id.toLowerCase() : ''
    if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/.test(id) || ids.has(id) ||
      typeof item?.title !== 'string' || !item.title.trim() || item.title.length > reminderTitleLimit ||
      !validTimestamp(item.at) || typeof item.paid !== 'boolean') {
      throw new Error('La copia contiene recordatorios inválidos o duplicados.')
    }
    ids.add(id)
    return { id, title: item.title.trim(), at: item.at, paid: item.paid }
  })
}

export function sameReminder(a: Reminder | undefined, b: Reminder) {
  return a?.id === b.id && a.title === b.title && a.at === b.at && a.paid === b.paid
}

const utc = (at: number) => new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const calendarText = (value: string) => value.replaceAll('\\', '\\\\').replace(/\r\n?|\n/g, '\\n').replace(/[;,]/g, '\\$&')

function foldLine(line: string) {
  const encoder = new TextEncoder()
  let output = ''
  let width = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    if (width + bytes > 75) { output += '\r\n '; width = 1 }
    output += char
    width += bytes
  }
  return output
}

export function reminderCalendar(reminder: Reminder, now = Date.now()) {
  const title = calendarText('Pagar ' + reminder.title)
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mi Dinero//Recordatorios//ES', 'BEGIN:VEVENT',
    'UID:' + reminder.id + '@mi-dinero', 'DTSTAMP:' + utc(now), 'DTSTART:' + utc(reminder.at),
    'DURATION:PT15M', 'SUMMARY:' + title,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + title, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].map(foldLine).join('\r\n')
}

export const shortcutName = 'Pago de Mi Dinero'

export function reminderShortcut(reminder: Reminder) {
  const payload = JSON.stringify({ titulo: 'Pagar ' + reminder.title, fecha: new Date(reminder.at).toISOString() })
  return 'shortcuts://run-shortcut?name=' + encodeURIComponent(shortcutName) + '&input=text&text=' + encodeURIComponent(payload)
}
