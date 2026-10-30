import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, CreditCard, LockKeyhole, ShieldCheck, UserRound, Users } from 'lucide-react'
import { api } from '../lib/api'
import { pounds } from '../lib/money'
import type { DemoState, PaymentItem } from '../lib/types'
import { Avatar } from './Avatar'

type PaymentsProps = {
  state: DemoState
  setState: (state: DemoState) => void
  persona: string
  showToast: (message: string) => void
}

function paymentStatus(payment: PaymentItem) {
  if (payment.status === 'paid') return 'Paid'
  if (payment.status === 'ready') return 'Ready for admin'
  return payment.kind === 'group' ? `${payment.paid_member_ids.length}/${payment.participant_ids.length} funded` : 'Action needed'
}

function PaymentCheckout({ payment, payerName, processing, onBack, onConfirm }: { payment: PaymentItem; payerName: string; processing: boolean; onBack: () => void; onConfirm: () => void }) {
  const individual = payment.kind === 'individual'
  return <div className="payment-checkout-page">
    <button className="payment-back" onClick={onBack}><ArrowLeft size={15} /> Back to payment details</button>
    <section className="payment-checkout-card">
      <div className="checkout-context">
        <span className={individual ? 'payment-kind individual' : 'payment-kind group'}>{individual ? <UserRound size={13} /> : <Users size={13} />}{individual ? 'Individual payment' : 'Admin vendor payment'}</span>
        <p className="section-label">Secure checkout</p>
        <h2>{payment.title}</h2>
        <p>{individual ? 'You are paying the vendor directly for your own booking.' : 'Every group share has arrived. As group admin, you are completing the single vendor payment.'}</p>
        <div className="checkout-guardrails"><span><Check size={14} /> Amount checked against the trip plan</span><span><Check size={14} /> Payee verified as {payment.vendor}</span><span><Check size={14} /> Receipt saved to group activity</span></div>
      </div>
      <aside className="vendor-payment-panel">
        <div className="paypal-wordmark"><span>Pay</span><b>Pal</b></div>
        <p className="section-label">Payment summary</p>
        <div className="vendor-line"><span>Pay to</span><strong>{payment.vendor}</strong></div>
        <div className="vendor-line"><span>Paid by</span><strong>{individual ? payerName : `${payerName} · group admin`}</strong></div>
        <div className="vendor-total"><span>Total</span><strong>{pounds(individual ? payment.share_cents : payment.total_cents, true)}</strong></div>
        <button className="paypal-button" onClick={onConfirm} disabled={processing}>{processing ? 'Processing…' : `Pay ${pounds(individual ? payment.share_cents : payment.total_cents, true)}`}</button>
        <span className="secure-row"><LockKeyhole size={13} /> Simulated PayPal sandbox checkout</span>
      </aside>
    </section>
  </div>
}

export function Payments({ state, setState, persona, showToast }: PaymentsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const membersById = useMemo(() => new Map(state.members.map((member) => [member.id, member])), [state.members])
  const selected = state.payments.find((payment) => payment.id === selectedId)

  const updateLocal = (payment: PaymentItem, action: 'contribute' | 'individual' | 'vendor') => {
    const next = structuredClone(state)
    const target = next.payments.find((item) => item.id === payment.id)!
    if (action === 'vendor') {
      target.status = 'paid'
      const planItem = next.plan.find((item) => item.id === target.plan_id)
      if (planItem) planItem.booked = true
    } else if (!target.paid_member_ids.includes(persona)) {
      target.paid_member_ids.push(persona)
      if (target.paid_member_ids.length === target.participant_ids.length) target.status = action === 'individual' ? 'paid' : 'ready'
    }
    setState(next)
  }

  const runAction = async (payment: PaymentItem, action: 'contribute' | 'individual' | 'vendor') => {
    setProcessing(true)
    const request = action === 'contribute' ? api.contributePayment(payment.id, persona) : action === 'individual' ? api.completeIndividualPayment(payment.id, persona) : api.payPaymentVendor(payment.id, persona)
    const remote = await request.catch(() => null)
    if (remote) setState(remote); else updateLocal(payment, action)
    setProcessing(false)
    setCheckoutOpen(false)
    showToast(action === 'vendor' ? 'Vendor payment completed and receipt logged' : action === 'individual' ? 'Your individual booking is marked paid' : 'Your group share has been sent')
  }

  if (selected && checkoutOpen) return <PaymentCheckout payment={selected} payerName={membersById.get(persona)?.name ?? persona} processing={processing} onBack={() => setCheckoutOpen(false)} onConfirm={() => runAction(selected, selected.kind === 'individual' ? 'individual' : 'vendor')} />

  if (selected) {
    const currentMemberPaid = selected.paid_member_ids.includes(persona)
    const isAdmin = selected.admin_id === persona
    const participants = selected.participant_ids.map((id) => membersById.get(id)).filter(Boolean) as DemoState['members']
    const collected = selected.share_cents * selected.paid_member_ids.length
    return <div className="payment-detail-page">
      <button className="payment-back" onClick={() => setSelectedId(null)}><ArrowLeft size={15} /> All payments</button>
      <section className="card payment-detail-card">
        <header className="payment-detail-head">
          <div><span className={selected.kind === 'group' ? 'payment-kind group' : 'payment-kind individual'}>{selected.kind === 'group' ? <Users size={13} /> : <UserRound size={13} />}{selected.kind === 'group' ? 'Group payment' : 'Individual payment'}</span><h1>{selected.title}</h1><p>{selected.vendor} · {selected.deadline}</p></div>
          <span className={`payment-status ${selected.status}`}>{paymentStatus(selected)}</span>
        </header>
        <div className="payment-detail-grid">
          <div className="payment-explainer">
            <p className="section-label">How this payment works</p><h2>{selected.kind === 'group' ? 'Collect first. Pay once.' : 'Your booking, your checkout.'}</h2><p>{selected.description}</p>
            <ol>{selected.kind === 'group' ? <><li><span>1</span>Each traveller sends the same protected share.</li><li><span>2</span>TripPilot unlocks vendor checkout only when everyone is funded.</li><li><span>3</span>The group admin reviews and pays the vendor once.</li></> : <><li><span>1</span>Review your own price and booking details.</li><li><span>2</span>Complete checkout directly with the vendor.</li><li><span>3</span>Your paid status returns to the group list.</li></>}</ol>
          </div>
          <aside className="payment-action-card">
            <p className="section-label">Pricing details</p>
            <div className="price-primary"><span>{selected.kind === 'group' ? 'Group total' : 'Your price'}</span><strong>{pounds(selected.kind === 'group' ? selected.total_cents : selected.share_cents, true)}</strong></div>
            {selected.kind === 'group' && <><div className="price-line"><span>Your share</span><strong>{pounds(selected.share_cents, true)}</strong></div><div className="price-line"><span>Collected</span><strong>{pounds(collected, true)}</strong></div><div className="funding-progress"><i style={{ width: `${Math.min(100, collected / selected.total_cents * 100)}%` }} /></div></>}
            {selected.status === 'paid' ? <div className="payment-complete-note"><CheckCircle2 size={18} /><span><strong>Payment complete</strong>Receipt saved to agent activity.</span></div> : selected.kind === 'individual' ? currentMemberPaid ? <div className="payment-complete-note"><CheckCircle2 size={18} /><span><strong>You have paid</strong>Other members complete their own checkout.</span></div> : <button className="primary-button full" onClick={() => setCheckoutOpen(true)}>Open individual checkout <ArrowRight size={15} /></button> : !currentMemberPaid ? <button className="paypal-button" onClick={() => runAction(selected, 'contribute')} disabled={processing}>{processing ? 'Sending…' : `Send my ${pounds(selected.share_cents, true)} share`}</button> : selected.status === 'ready' && isAdmin ? <button className="primary-button full" onClick={() => setCheckoutOpen(true)}>Open vendor payment page <ArrowRight size={15} /></button> : selected.status === 'ready' ? <div className="admin-wait-note"><ShieldCheck size={18} /><span><strong>Fully funded</strong>Waiting for the group admin to pay {selected.vendor}.</span></div> : <div className="admin-wait-note"><Clock3 size={18} /><span><strong>Your share is in</strong>Checkout unlocks after {selected.participant_ids.length - selected.paid_member_ids.length} more {selected.participant_ids.length - selected.paid_member_ids.length === 1 ? 'person' : 'people'} pay.</span></div>}
            <span className="secure-row"><ShieldCheck size={13} /> Members never share payment credentials</span>
          </aside>
        </div>
        {selected.kind === 'group' && <section className="payment-members"><div><p className="section-label">Group collection</p><h2>{selected.paid_member_ids.length} of {selected.participant_ids.length} shares received</h2></div><div className="payment-member-grid">{participants.map((member) => { const paid = selected.paid_member_ids.includes(member.id); return <article key={member.id}><Avatar member={member} /><span><strong>{member.name}{member.id === selected.admin_id && ' · admin'}</strong><small>{paid ? `Sent ${pounds(selected.share_cents)}` : 'Still to pay'}</small></span><i className={paid ? 'paid' : ''}>{paid ? <Check size={13} /> : <Clock3 size={13} />}</i></article> })}</div></section>}
      </section>
    </div>
  }

  const outstanding = state.payments.filter((payment) => payment.status !== 'paid')
  const completed = state.payments.filter((payment) => payment.status === 'paid')
  return <div className="payments-page">
    <div className="payments-summary"><article><span>Needs attention</span><strong>{outstanding.length}</strong><small>bookings still open</small></article><article><span>Ready for admin</span><strong>{outstanding.filter((payment) => payment.status === 'ready').length}</strong><small>fully funded</small></article><article><span>Completed</span><strong>{completed.length}</strong><small>receipts logged</small></article></div>
    <section className="payments-section"><div className="payments-section-head"><div><p className="section-label">Open payments</p><h2>Book the plan, one item at a time.</h2></div><p>Individual bookings stay personal. Group bookings unlock only after every share arrives.</p></div><div className="payment-list">{outstanding.map((payment) => <button key={payment.id} className="payment-row" onClick={() => setSelectedId(payment.id)}><span className="payment-row-icon">{payment.kind === 'group' ? <Users size={18} /> : <UserRound size={18} />}</span><span><strong>{payment.title}</strong><small>{payment.vendor} · {payment.deadline}</small></span><span className={payment.kind === 'group' ? 'payment-kind group' : 'payment-kind individual'}>{payment.kind}</span><span className={`payment-status ${payment.status}`}>{paymentStatus(payment)}</span><ArrowRight size={16} /></button>)}</div></section>
    <section className="payments-section completed"><div className="payments-section-head"><div><p className="section-label">Completed</p><h2>Paid and recorded.</h2></div></div><div className="payment-list">{completed.map((payment) => <button key={payment.id} className="payment-row" onClick={() => setSelectedId(payment.id)}><span className="payment-row-icon"><CheckCircle2 size={18} /></span><span><strong>{payment.title}</strong><small>{payment.vendor}</small></span><span className={payment.kind === 'group' ? 'payment-kind group' : 'payment-kind individual'}>{payment.kind}</span><span className="payment-status paid">Paid</span><ArrowRight size={16} /></button>)}</div></section>
  </div>
}
