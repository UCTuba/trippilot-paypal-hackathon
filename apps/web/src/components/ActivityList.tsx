import { Bot, CheckCircle2, CreditCard, PoundSterling, RefreshCw } from 'lucide-react'
import type { AgentEvent } from '../lib/types'

const icons = { price: RefreshCw, approval: CheckCircle2, plan: Bot, payment: CreditCard, booking: CheckCircle2, cover: PoundSterling, expense: PoundSterling }

export function ActivityList({ events, compact = false }: { events: AgentEvent[]; compact?: boolean }) {
  const rows = compact ? events.slice(0, 3) : events
  return <div className="activity-list">
    {rows.map((event) => {
      const Icon = icons[event.kind as keyof typeof icons] ?? Bot
      return <article className="activity-row" key={event.id}>
        <span className={`activity-icon activity-${event.kind}`}><Icon size={16} /></span>
        <div><strong>{event.title}</strong><p>{event.detail}</p></div>
        <time>{event.time}</time>
      </article>
    })}
  </div>
}

