import test from 'node:test'
import assert from 'node:assert/strict'
import {
  accountBalances, calendarDay, latestFirst, parseOpening, makeBackup, monthly, parseAmount, readBackup,
  searchText, shiftMonth, summarize, validDay, type Entry,
} from '../src/ledger.ts'

const expense: Entry = {
  id: '11111111-1111-4111-8111-111111111111', kind: 'expense', cents: 1205, category: 'food',
  date: '2024-02-29', concept: 'Mercado', createdAt: 1,
}
const income: Entry = {
  ...expense, id: '22222222-2222-4222-8222-222222222222', kind: 'income',
  cents: 20000, category: 'salary', concept: 'Nómina', createdAt: 2,
}

test('el importe se convierte a céntimos incluso con coma decimal', () => {
  for (const [raw, expected] of Object.entries({
    '0,10': 10, '12.05': 1205, '1.234,56': 123456, '9': 900, ',5': 50, ' 2,1 ': 210, '999999999,99': 99999999999,
  })) assert.equal(parseAmount(raw), expected)
  for (const raw of ['', '0', '-1', '1.005', 'NaN', '1e3', '€2', '1000000000', '99,999']) assert.equal(parseAmount(raw), null)
})

test('las fechas locales respetan años bisiestos y cambios de mes', () => {
  for (const day of ['2000-02-29', '2024-02-29', '0001-01-01', '9999-12-31']) assert.ok(validDay(day))
  for (const day of ['2025-02-29', '1900-02-29', '2024-02-30', '0000-02-01', '2024-13-01', '2024-3-1']) assert.ok(!validDay(day))
  assert.equal(calendarDay(new Date(2024, 1, 29, 23, 59)), '2024-02-29')
  assert.equal(shiftMonth('2024-01', -1), '2023-12')
  assert.equal(shiftMonth('2024-12', 1), '2025-01')
  assert.equal(shiftMonth('0001-01', -1), '0001-01')
  assert.equal(shiftMonth('9999-12', 1), '9999-12')
})

test('el resumen solo agrega el mes y ordena las categorías por gasto', () => {
  const bus = { ...expense, category: 'transport' as const, cents: 500 }
  const entries = monthly([expense, income, bus, { ...expense, date: '2024-03-01' }], '2024-02')
  const { income: total, expense: spent, balance, breakdown } = summarize(entries)
  assert.deepEqual([total, spent, balance], [20000, 1705, 18295])
  assert.deepEqual(breakdown.map(x => [x.category, x.cents]), [['food', 1205], ['transport', 500]])
  assert.equal(breakdown[0].share, 1205 / 1705)
  assert.deepEqual(summarize([]), { income: 0, expense: 0, balance: 0, breakdown: [] })
  assert.equal(summarize([expense]).balance, -1205)
  assert.equal(latestFirst([expense, income])[0].id, income.id)
  assert.equal(searchText('  NÓMINA  '), 'nomina')
})

test('la copia versionada admite todos los movimientos y también una cartera vacía', () => {
  for (const entries of [[], [income, expense]]) {
    const ledger = { entries, openingCents: -1234 }
    assert.deepEqual(readBackup(JSON.stringify(makeBackup(ledger))), ledger)
  }
})

test('una copia dañada, incompatible o duplicada se rechaza entera', () => {
  for (const patch of [
    { cents: 0 }, { cents: 1.5 }, { cents: 1e15 }, { concept: 9 }, { kind: 'something' },
    { category: 'salary' }, { category: '__proto__' }, { date: '2024-02-31' }, { id: 'x' }, { createdAt: -1 },
  ]) assert.throws(() => readBackup(JSON.stringify({ ...makeBackup({ entries: [], openingCents: 0 }), transactions: [income, { ...expense, ...patch }] })))
  for (const text of ['{', 'null', '{}', JSON.stringify(makeBackup({ entries: [expense, expense], openingCents: 0 })),
    JSON.stringify({ ...makeBackup({ entries: [], openingCents: 0 }), version: 3 }), JSON.stringify({ ...makeBackup({ entries: [], openingCents: 0 }), currency: 'USD' })]) {
    assert.throws(() => readBackup(text))
  }
})

test('el saldo inicial se arrastra una vez, incluso en meses sin movimientos', () => {
  const ledger = { openingCents: 10000, entries: [
    { ...expense, date: '2024-09-10' }, { ...income, date: '2024-11-02' },
  ] }
  assert.deepEqual(accountBalances(ledger, '2024-08'), { closing: 10000, total: 28795 })
  assert.deepEqual(accountBalances(ledger, '2024-10'), { closing: 8795, total: 28795 })
  assert.deepEqual(accountBalances(ledger, '2024-11'), { closing: 28795, total: 28795 })
  assert.equal(parseOpening('-123,50'), -12350)
  assert.equal(parseOpening('0'), 0)
  assert.equal(parseOpening(''), null)
  assert.equal(parseOpening('-1,234'), null)
})

test('se restauran las copias anteriores y los conceptos vacíos', () => {
  const entries = [{ ...expense, concept: '' }]
  const old = { app: 'mi-dinero', currency: 'EUR', version: 1, transactions: entries }
  assert.deepEqual(readBackup(JSON.stringify(old)), { entries, openingCents: 0 })
  for (const openingCents of [undefined, null, '20', 0.5, 1e12]) {
    assert.throws(() => readBackup(JSON.stringify({ ...old, version: 2, openingCents })))
  }
})
