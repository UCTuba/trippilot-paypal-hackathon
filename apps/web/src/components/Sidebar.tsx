import { Activity, CalendarDays, CreditCard, LayoutDashboard, ReceiptText, Route, Sparkles } from 'lucide-react'
import type { View } from '../lib/types'

const items: { id: View; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'plan', label: 'Plan', icon: CalendarDays, badge: 'v3' },
  { id: 'checkout', label: 'Group checkout', icon: CreditCard, badge: '5/6' },
  { id: 'money', label: 'Trip tab', icon: ReceiptText },
  { id: 'activity', label: 'Agent activity', icon: Activity, badge: '3' },
]

export function Sidebar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onChange('overview')} aria-label="TripPilot home">
        <span className="brand-mark"><Route size={21} strokeWidth={2.6} /></span>
        <span>TripPilot</span>
      </button>
      <nav className="side-nav" aria-label="Trip workspace">
        <p className="nav-label">Trip workspace</p>
        {items.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(id)}>
            <Icon size={18} />
            <span>{label}</span>
            {badge && <span className="nav-badge">{badge}</span>}
          </button>
        ))}
      </nav>
      <div className="agent-card">
        <div className="agent-orbit"><Sparkles size={17} /></div>
        <div>
          <strong>Pilot is watching</strong>
          <p>Prices checked 4 min ago</p>
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

