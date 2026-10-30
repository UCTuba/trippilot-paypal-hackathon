import { ArrowRight, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react'
import type { DemoState } from '../lib/types'
import { pounds } from '../lib/money'
import { Avatar } from './Avatar'

export function CheckoutCard({ state, onOpen }: { state: DemoState; onOpen: () => void }) {
  const committed = state.members.filter((member) => member.committed).length
  const progress = (committed / state.members.length) * 100
  return (
    <article className="checkout-card">
      <div className="checkout-kicker"><span><LockKeyhole size={14} /> Group checkout</span><span className="status-open">Open</span></div>
      <div className="checkout-title"><div><h3>{state.checkout.title}</h3><p>{state.checkout.vendor} · free cancellation for 24h</p></div><strong>{pounds(state.checkout.total_cents, true)}</strong></div>
      <div className="progress-meta"><span>{committed} of {state.members.length} committed</span><strong>{pounds(state.checkout.share_cents, true)} each</strong></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="commit-row">
        <div className="commit-avatars">
          {state.members.map((member) => <span key={member.id} className={member.committed ? '' : 'waiting'}><Avatar member={member} small />{member.committed ? <i>✓</i> : <i>…</i>}</span>)}
        </div>
        <span className="deadline"><Clock3 size={14} /> {state.checkout.deadline}</span>
      </div>
      <div className="checkout-safe"><ShieldCheck size={17} /><p><strong>No one is charged yet.</strong> PayPal authorises each share. We charge only after everyone commits and the price is re-checked.</p></div>
      <button className="primary-button full" onClick={onOpen}>Review checkout <ArrowRight size={16} /></button>
    </article>
  )
}

