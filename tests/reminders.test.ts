import test from 'node:test'
import assert from 'node:assert/strict'
import { makeBackup, readBackup } from '../src/ledger.ts'
import { parseReminderTime, reminderCalendar, reminderInput, reminderShortcut, type Reminder } from '../src/reminders.ts'

const payment: Reminder = {
  id: '11111111-1111-4111-8111-111111111111', title: 'Seguro, póliza; ' + 'á'.repeat(60) + '\nBEGIN:VEVENT',
  at: Date.UTC(2026, 10, 25, 8, 30), paid: false,
}

test('el archivo de calendario lleva el aviso a la hora exacta y protege el título', () => {
  const calendar = reminderCalendar(payment, Date.UTC(2026, 10, 23))
  for (const line of calendar.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
  const unfolded = calendar.replaceAll('\r\n ', '')
  assert.match(unfolded, /DTSTART:20261125T083000Z\r\n/)
  assert.match(unfolded, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0M/)
  assert.equal(unfolded.split('\r\n').filter(line => line === 'BEGIN:VEVENT').length, 1)
  assert.ok(unfolded.includes('SUMMARY:Pagar Seguro\\, póliza\\; ' + 'á'.repeat(60) + '\\nBEGIN:VEVENT'))
})

test('el atajo recibe la misma hora y la copia valida recordatorios sin cambiar el formato anterior', () => {
  const url = new URL(reminderShortcut(payment))
  assert.equal(url.searchParams.get('name'), 'Pago de Mi Dinero')
  assert.equal(JSON.parse(url.searchParams.get('text')!).fecha, '2026-11-25T08:30:00.000Z')
  assert.equal(parseReminderTime(reminderInput(payment.at)), payment.at)
  assert.equal(parseReminderTime('2026-02-30T09:00'), null)
  const ledger = { entries: [], openingCents: 0, reminders: [payment] }
  assert.deepEqual(readBackup(JSON.stringify(makeBackup(ledger))), ledger)
  const planned: Reminder = { ...payment, cents: 1299, category: 'spotify' }
  assert.deepEqual(readBackup(JSON.stringify(makeBackup({ ...ledger, reminders: [planned] }))).reminders, [planned])
  assert.throws(() => readBackup(JSON.stringify(makeBackup({ ...ledger, reminders: [{ ...planned, category: 'salary' }] }))))
  assert.throws(() => readBackup(JSON.stringify(makeBackup({ ...ledger, reminders: [{ ...planned, cents: 0 }] }))))
  assert.throws(() => readBackup(JSON.stringify(makeBackup({ ...ledger, reminders: [payment, payment] }))))
  assert.equal(readBackup(JSON.stringify(makeBackup({ entries: [], openingCents: 0 }))).reminders, undefined)
})
