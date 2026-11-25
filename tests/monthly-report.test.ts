import test from 'node:test'
import assert from 'node:assert/strict'
import { monthlyReport } from '../src/monthlyReport.ts'
import { monthlyAlertCalendar, nextMonthlyAlert } from '../src/reminders.ts'
import type { Entry } from '../src/ledger.ts'

const expense: Entry = {
  id: 'expense', kind: 'expense', category: 'food', concept: 'Mercado', date: '2026-11-01', cents: 9000, createdAt: 0,
}
const entries: Entry[] = [
  expense,
  { ...expense, id: 'coffee', category: 'machine', cents: 90 },
  { ...expense, id: 'market2', category: 'supermarket', date: '2026-11-03', cents: 1500 },
  { ...expense, id: 'salary', kind: 'income', category: 'salary', cents: 100000 },
  { ...expense, id: 'last', date: '2026-10-20', cents: 20000 },
  { ...expense, id: 'future', date: '2026-12-01', cents: 40000 },
]

test('el cierre usa solo su mes, reúne categorías antiguas y arrastra el saldo correcto', () => {
  const report = monthlyReport(entries, 350000, '2026-11')
  assert.equal(report.totals.balance, 89410)
  assert.deepEqual(report.totals.breakdown.map(item => [item.category, item.cents]), [['food', 10500], ['machine', 90]])
  assert.equal(report.largestExpense, expense)
  assert.equal(report.expenseCount, 3)
  assert.equal(report.spendingDays, 2)
  assert.deepEqual(report.previous, { month: '2026-10', expense: 20000 })
  assert.equal(report.closing, 419500)
})

test('un mes vacío no inventa gastos y mantiene su saldo acumulado', () => {
  const report = monthlyReport(entries, 350000, '2027-01')
  assert.equal(report.movementCount, 0)
  assert.equal(report.totals.expense, 0)
  assert.equal(report.largestExpense, null)
  assert.equal(report.closing, 379500)
})

test('septiembre abre el historial visible y una comparación puede partir de cero', () => {
  const august = { ...expense, date: '2026-08-31' }
  const september = monthlyReport([august], 0, '2026-09')
  assert.equal(september.previous, null)
  assert.equal(september.closing, -9000)
  const october = monthlyReport(entries, 0, '2026-10')
  assert.deepEqual(october.previous, { month: '2026-09', expense: 0 })
})

test('el aviso de calendario se repite el día 1 a las 09:00 también al cambiar de año', () => {
  const now = new Date(2026, 11, 31, 23, 59)
  assert.deepEqual(nextMonthlyAlert(now), new Date(2027, 0, 1, 9))
  const calendar = monthlyAlertCalendar(now)
  assert.match(calendar, /DTSTART:20270101T090000\r\n/)
  assert.match(calendar, /RRULE:FREQ=MONTHLY;BYMONTHDAY=1\r\n/)
  assert.match(calendar, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0M/)
})
