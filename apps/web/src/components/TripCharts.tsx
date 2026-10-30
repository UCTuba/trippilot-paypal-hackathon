import type { CSSProperties } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { pounds } from '../lib/money'
import type { Expense, Member } from '../lib/types'

const categoryColours = ['#f2775d', '#3f7e9c', '#75aa91', '#e2b94f', '#8872b2']

export function SpendByCategory({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0)
  const categoryMap = expenses.reduce((map, expense) => {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount_cents)
    return map
  }, new Map<string, number>())
  const categories = [...categoryMap.entries()].map(([label, cents], index) => ({ label, cents, colour: categoryColours[index % categoryColours.length] }))
  let cursor = 0
  const segments = categories.map((category) => {
    const start = cursor
    cursor += total ? category.cents / total * 100 : 0
    return `${category.colour} ${start}% ${cursor}%`
  })
  const style = { '--spend-ring': total ? `conic-gradient(${segments.join(', ')})` : '#e6e8e2' } as CSSProperties
  const summary = categories.map((category) => `${category.label} ${pounds(category.cents, true)}`).join(', ')

  return <article className="card chart-card">
    <header><div><p className="section-label">Spend mix</p><h2>Where the money went</h2></div><span className="chart-total">{expenses.length} entries</span></header>
    <div className="donut-layout">
      <div className="spend-donut" style={style} role="img" aria-label={summary || 'No expenses yet'}><span><strong>{pounds(total, true)}</strong><small>total</small></span></div>
      <div className="chart-legend">{categories.map((category) => <div key={category.label}><i style={{ background: category.colour }} /><span>{category.label}</span><strong>{Math.round(category.cents / total * 100)}%</strong><small>{pounds(category.cents)}</small></div>)}</div>
    </div>
  </article>
}

export function MemberBalances({ balances, members }: { balances: Record<string, number>; members: Member[] }) {
  const rows = members.map((member) => ({ member, cents: balances[member.id] ?? 0 }))
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.cents)))
  const summary = rows.map(({ member, cents }) => `${member.name} ${cents >= 0 ? 'is owed' : 'owes'} ${pounds(Math.abs(cents), true)}`).join(', ')

  return <article className="card chart-card balance-chart">
    <header><div><p className="section-label">Balance map</p><h2>Who owes what</h2></div><span className="chart-total">live split</span></header>
    <div className="balance-plot" role="img" aria-label={summary}>
      {rows.map(({ member, cents }) => <div className="balance-row" key={member.id}>
        <span className="balance-person"><i style={{ background: member.color }}>{member.initials}</i>{member.name}</span>
        <span className="balance-track"><i className={cents >= 0 ? 'positive' : 'negative'} style={{ width: `${Math.max(3, Math.abs(cents) / max * 100)}%` }} /></span>
        <strong className={cents >= 0 ? 'positive' : 'negative'}>{cents >= 0 ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}{pounds(Math.abs(cents))}</strong>
      </div>)}
    </div>
    <div className="balance-key"><span><i className="positive" />gets back</span><span><i className="negative" />needs to pay</span></div>
  </article>
}
