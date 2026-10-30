import { Activity, CalendarDays, CreditCard, MessageCircleMore, Plus, ReceiptText, Route, Sparkles } from 'lucide-react'
import type { TripGroup, View } from '../lib/types'

const items: { id: View; label: string; icon: typeof MessageCircleMore; badge?: string }[] = [
  { id: 'chat', label: 'Trip room', icon: MessageCircleMore },
  { id: 'plan', label: 'Plan', icon: CalendarDays, badge: 'v3' },
  { id: 'checkout', label: 'Payments', icon: CreditCard, badge: '2 due' },
  { id: 'money', label: 'Trip tab', icon: ReceiptText },
  { id: 'activity', label: 'Agent activity', icon: Activity, badge: '3' },
]

export function Sidebar({ view, onChange, groups, activeGroup, onGroup, onCreate }: { view: View; onChange: (view: View) => void; groups: TripGroup[]; activeGroup: string; onGroup: (id: string) => void; onCreate: () => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onChange('chat')} aria-label="TripPilot home">
        <span className="brand-mark"><Route size={21} strokeWidth={2.6} /></span>
        <span>TripPilot</span>
      </button>
      <nav className="group-nav" aria-label="Trip groups and workspace">
        <div className="group-nav-head"><p className="nav-label">Your trip groups</p><button onClick={onCreate} aria-label="Create a trip group"><Plus size={14} /></button></div>
        <div className="group-tree">
          {groups.map((group) => {
            const selected = activeGroup === group.id
            return <div className={selected ? 'group-tree-item selected' : 'group-tree-item'} key={group.id}>
              <button className={selected ? 'group-link active' : 'group-link'} onClick={() => onGroup(group.id)} aria-expanded={selected}>
                <span className="group-glyph">{group.destination === 'Undecided' ? '?' : group.destination.slice(0, 1)}</span>
                <span><strong>{group.name}</strong><small>{group.destination}</small></span>
                {group.unread > 0 && <i>{group.unread}</i>}
              </button>
              {selected && <div className="group-workspace">
                <p className="workspace-label">Group workspace</p>
                {items.map(({ id, label, icon: Icon, badge }) => (
                  <button key={id} className={view === id ? 'workspace-item active' : 'workspace-item'} onClick={() => onChange(id)}>
                    <Icon size={15} />
                    <span>{label}</span>
                    {badge && <span className="nav-badge">{badge}</span>}
                  </button>
                ))}
              </div>}
            </div>
          })}
        </div>
      </nav>
      <div className="agent-card">
        <div className="agent-orbit"><Sparkles size={17} /></div>
        <div>
          <strong>Pilot is on call</strong>
          <p>Joins only when invited</p>
        </div>
        <span className="live-dot" />
      </div>
      <div className="sidebar-footer">
        <span className="mini-avatar">SS</span>
        <div><strong>Surya</strong><span>Trip owner</span></div>
        <button aria-label="Account menu">•••</button>
      </div>
    </aside>
  )
}
