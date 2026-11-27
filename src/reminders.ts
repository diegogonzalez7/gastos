import type { CategoryId } from './ledger.ts'

export interface Reminder {
  id: string
  title: string
  at: number
  paid: boolean
  cents?: number
  category?: CategoryId
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
  return validReminderTime(at) && reminderInput(at) === value ? at : null
}

export const reminderDate = (at: number) => new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long', timeStyle: 'short',
}).format(at)

export function validReminderTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= lastReminderTime
}

export function sameReminder(a: Reminder | undefined, b: Reminder) {
  return a?.id === b.id && a.title === b.title && a.at === b.at && a.paid === b.paid &&
    a.cents === b.cents && a.category === b.category
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

function calendarEvent(uid: string, title: string, start: string, now: number, recurrence?: string) {
  const escapedTitle = calendarText(title)
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mi Dinero//Recordatorios//ES', 'BEGIN:VEVENT',
    'UID:' + uid + '@mi-dinero', 'DTSTAMP:' + utc(now), 'DTSTART:' + start,
    'DURATION:PT15M', 'SUMMARY:' + escapedTitle,
    ...(recurrence ? ['RRULE:' + recurrence] : []),
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + escapedTitle, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].map(foldLine).join('\r\n')
}

export function reminderCalendar(reminder: Reminder, now = Date.now()) {
  return calendarEvent(reminder.id, 'Pagar ' + reminder.title, utc(reminder.at), now)
}

export function nextMonthlyAlert(now = new Date()) {
  const first = new Date(now)
  first.setMonth(first.getMonth() + 1, 1)
  first.setHours(9, 0, 0, 0)
  return first
}

export const monthlyAlertTitle = 'Ver el cierre mensual en Mi Dinero'

export function monthlyAlertCalendar(now = new Date()) {
  const start = reminderInput(nextMonthlyAlert(now).getTime()).replace(/[-:]/g, '') + '00'
  return calendarEvent('cierre-mensual', monthlyAlertTitle, start, now.getTime(), 'FREQ=MONTHLY;BYMONTHDAY=1')
}

export const shortcutName = 'Pago de Mi Dinero'

export function appleReminderShortcut(title: string, at: number) {
  const payload = JSON.stringify({ titulo: title, fecha: new Date(at).toISOString() })
  return 'shortcuts://run-shortcut?name=' + encodeURIComponent(shortcutName) + '&input=text&text=' + encodeURIComponent(payload)
}

export function reminderShortcut(reminder: Reminder) {
  return appleReminderShortcut('Pagar ' + reminder.title, reminder.at)
}
