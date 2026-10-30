import { describe, expect, it } from 'vitest'
import { calculateBalances, calculateSettlements, splitCents } from './money'

describe('money maths', () => {
  it('preserves every cent', () => {
    expect(splitCents(1000, ['c', 'a', 'b'])).toEqual({ a: 334, b: 333, c: 333 })
  })

  it('keeps expense balances at zero', () => {
    const balances = calculateBalances([{ id: '1', title: 'Lunch', payer: 'a', amount_cents: 1001, participants: ['a', 'b', 'c'], category: 'Food' }])
    expect(Object.values(balances).reduce((sum, value) => sum + value, 0)).toBe(0)
    expect(calculateSettlements(balances).reduce((sum, row) => sum + row.cents, 0)).toBe(667)
  })
})

