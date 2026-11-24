import { accountBalances, monthly, shiftMonth, summarize, type Entry } from './ledger.ts'

export function monthlyReport(entries: Entry[], openingCents: number, month: string) {
  const movements = monthly(entries, month)
  const totals = summarize(movements)
  const previousMonth = shiftMonth(month, -1)
  const previousEntries = previousMonth === month ? [] : monthly(entries, previousMonth)
  const expenses = movements.filter(entry => entry.kind === 'expense')
  const largestExpense = expenses.reduce<Entry | null>((largest, expense) =>
    !largest || expense.cents > largest.cents ? expense : largest, null)
  const { closing } = accountBalances({ entries, openingCents }, month)
  return {
    month, totals, closing, largestExpense,
    movementCount: movements.length,
    expenseCount: expenses.length,
    spendingDays: new Set(expenses.map(entry => entry.date)).size,
    previous: previousEntries.length ? { month: previousMonth, expense: summarize(previousEntries).expense } : null,
  }
}

export type MonthlyReport = ReturnType<typeof monthlyReport>
