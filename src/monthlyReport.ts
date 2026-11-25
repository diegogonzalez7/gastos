import { accountBalances, monthly, netExpense, shiftMonth, summarize, type Entry } from './ledger.ts'

export function monthlyReport(entries: Entry[], openingCents: number, month: string, firstHistoryMonth: string) {
  const movements = monthly(entries, month)
  const totals = summarize(movements)
  const previousMonth = shiftMonth(month, -1)
  const previousEntries = previousMonth >= firstHistoryMonth && previousMonth < month ? monthly(entries, previousMonth) : null
  const expenses = movements.filter(entry => entry.kind === 'expense')
  const largestExpense = expenses.reduce<Entry | null>((largest, expense) =>
    netExpense(expense) > (largest ? netExpense(largest) : 0) ? expense : largest, null)
  const refundsCount = entries.reduce((count, entry) => count + (entry.refunds?.filter(refund => refund.date.startsWith(month)).length ?? 0), 0)
  const movementCount = movements.length + refundsCount
  const { closing } = accountBalances({ entries, openingCents }, month)
  return {
    month, totals, closing, largestExpense,
    movementCount,
    expenseCount: expenses.length,
    spendingDays: new Set(expenses.map(entry => entry.date)).size,
    previous: previousEntries && (movementCount || previousEntries.length) ? { month: previousMonth, expense: summarize(previousEntries).expense } : null,
  }
}

export type MonthlyReport = ReturnType<typeof monthlyReport>
