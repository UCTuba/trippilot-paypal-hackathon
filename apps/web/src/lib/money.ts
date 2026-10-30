import type { Expense, Transfer } from './types'

export const pounds = (cents: number, compact = false) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: compact && cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)

export function splitCents(total: number, ids: string[]) {
  const sorted = [...ids].sort()
  const base = Math.floor(total / sorted.length)
  const remainder = total % sorted.length
  return Object.fromEntries(sorted.map((id, index) => [id, base + (index < remainder ? 1 : 0)]))
}

export function calculateBalances(expenses: Expense[]) {
  const balances: Record<string, number> = {}
  expenses.forEach((expense) => {
    balances[expense.payer] = (balances[expense.payer] ?? 0) + expense.amount_cents
    const shares = splitCents(expense.amount_cents, expense.participants)
    Object.entries(shares).forEach(([id, share]) => {
      balances[id] = (balances[id] ?? 0) - share
    })
  })
  return balances
}

export function calculateSettlements(balances: Record<string, number>): Transfer[] {
  const debtors = Object.entries(balances)
    .filter(([, value]) => value < 0)
    .map(([id, value]) => [id, -value] as [string, number])
    .sort((a, b) => b[1] - a[1])
  const creditors = Object.entries(balances)
    .filter(([, value]) => value > 0)
    .map(([id, value]) => [id, value] as [string, number])
    .sort((a, b) => b[1] - a[1])
  const transfers: Transfer[] = []
  let di = 0
  let ci = 0
  while (di < debtors.length && ci < creditors.length) {
    const cents = Math.min(debtors[di][1], creditors[ci][1])
    transfers.push({ payer: debtors[di][0], recipient: creditors[ci][0], cents })
    debtors[di][1] -= cents
    creditors[ci][1] -= cents
    if (debtors[di][1] === 0) di += 1
    if (creditors[ci][1] === 0) ci += 1
  }
  return transfers
}

