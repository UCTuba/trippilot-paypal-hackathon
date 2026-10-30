import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Bot, CalendarDays, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, CreditCard, FileText, Info, Lightbulb, LockKeyhole,
  MapPin, MessageSquareText, Plus, ReceiptText, Send, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import { ActivityList } from './components/ActivityList'
import { Avatar } from './components/Avatar'
import { CheckoutCard } from './components/CheckoutCard'
import { Itinerary } from './components/Itinerary'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { api } from './lib/api'
import { calculateBalances, calculateSettlements, pounds } from './lib/money'
import { freshSeed } from './lib/seed'
import type { DemoState, Expense, View } from './lib/types'

const viewTitles: Record<View, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'Lake District Reset', title: 'Everything is nearly ready.', description: 'One commitment left, then Pilot can book the cabin for everyone.' },
  plan: { eyebrow: 'Plan v3 · locked', title: 'Three days, agreed together.', description: 'A slower Lake District weekend with enough room to breathe.' },
  checkout: { eyebrow: 'Group checkout · GC-2408', title: 'One cabin. Six approvals.', description: 'Every person controls their share. Nothing moves until the whole group is ready.' },
  money: { eyebrow: 'Trip tab', title: 'Every pound, accounted for.', description: 'Add shared expenses, see fair balances and settle with fewer transfers.' },
  activity: { eyebrow: 'Agent activity', title: 'Nothing happens in the dark.', description: 'Every proposal, approval, price check and payment step is recorded here.' },
}

function App() {
  const [state, setState] = useState<DemoState>(freshSeed)
  const [view, setView] = useState<View>('overview')
  const [persona, setPersona] = useState('maya')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    api.demo().then((data) => { setState(data); setIsOnline(true) }).catch(() => setIsOnline(false))
  }, [])

  const reset = async () => {
    const next = await api.reset().catch(() => freshSeed())
    setState(next)
    setView('overview')
    showToast('Demo reset to a fresh judging state')
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  const changeView = (next: View) => { setView(next); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const current = viewTitles[view]

  return (
    <div className="app-shell">
      <div className={sidebarOpen ? 'sidebar-wrap open' : 'sidebar-wrap'}>
        <Sidebar view={view} onChange={changeView} />
        <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
      </div>
      <main className="main-shell">
        <Topbar members={state.members} persona={persona} onPersona={setPersona} onReset={reset} onMenu={() => setSidebarOpen(true)} />
        <div className="page">
          <div className="page-heading">
            <div><p className="eyebrow">{current.eyebrow}</p><h1>{current.title}</h1><p>{current.description}</p></div>
            <div className="mode-pill"><span className={isOnline ? 'live-dot' : 'demo-dot'} />{isOnline ? state.mode.replace('-', ' ') : 'local demo mode'}</div>
          </div>
          {view === 'overview' && <Overview state={state} onView={changeView} />}
          {view === 'plan' && <Plan state={state} setState={setState} showToast={showToast} />}
          {view === 'checkout' && <Checkout state={state} setState={setState} persona={persona} setPersona={setPersona} showToast={showToast} />}
          {view === 'money' && <Money state={state} setState={setState} persona={persona} showToast={showToast} />}
          {view === 'activity' && <Activity state={state} />}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  )
}

function Overview({ state, onView }: { state: DemoState; onView: (view: View) => void }) {
  const total = state.plan.reduce((sum, item) => sum + item.cents, 0)
  return <>
    <section className="stats-row">
      <article><span className="stat-icon coral"><CalendarDays size={18} /></span><div><p>Trip dates</p><strong>{state.trip.dates}</strong><span>3 nights · 4 days</span></div></article>
      <article><span className="stat-icon teal"><Users size={18} /></span><div><p>Travellers</p><strong>{state.members.length} friends</strong><span>2 planners · 4 members</span></div></article>
      <article><span className="stat-icon yellow"><CircleDollarSign size={18} /></span><div><p>Planned cost</p><strong>{pounds(total / state.members.length, true)} each</strong><span className="good">{pounds(state.trip.budget_per_person - total / state.members.length, true)} under budget</span></div></article>
    </section>

    <section className="overview-grid">
      <div className="card panel itinerary-panel">
        <div className="panel-heading"><div><p className="section-label">The plan</p><h2>Weekend at a glance</h2></div><button className="text-button" onClick={() => onView('plan')}>Open full plan <ArrowRight size={15} /></button></div>
        <Itinerary items={state.plan} />
      </div>
      <div className="side-stack">
        <CheckoutCard state={state} onOpen={() => onView('checkout')} />
        <article className="card pilot-note">
          <div className="pilot-note-head"><span><Sparkles size={16} /></span><strong>Pilot’s note</strong><time>4m</time></div>
          <p>Fell House is still within your approved cap. Leo is the last person to commit—want me to send a friendly nudge?</p>
          <div><button>Not now</button><button className="soft-button"><Send size={14} /> Send nudge</button></div>
        </article>
      </div>
    </section>

    <section className="card panel activity-panel">
      <div className="panel-heading"><div><p className="section-label">Live audit trail</p><h2>What just happened</h2></div><button className="text-button" onClick={() => onView('activity')}>See everything <ArrowRight size={15} /></button></div>
      <ActivityList events={state.events} compact />
    </section>
  </>
}

function Plan({ state, setState, showToast }: { state: DemoState; setState: (state: DemoState) => void; showToast: (message: string) => void }) {
  const [prompt, setPrompt] = useState('')
  const [proposal, setProposal] = useState<{ summary: string; delta: number } | null>(null)
  const [thinking, setThinking] = useState(false)

  const replan = async () => {
    if (!prompt.trim()) return
    setThinking(true)
    const response = await api.replan(prompt).catch(() => ({ version: state.trip.version + 1, summary: prompt.toLowerCase().includes('drop') ? 'Removed the stop and tightened the route' : 'Rebalanced the plan around your request', delta_cents: -1200 }))
    setProposal({ summary: response.summary, delta: response.delta_cents })
    setThinking(false)
  }
  const accept = () => {
    if (!proposal) return
    const next = structuredClone(state)
    next.trip.version += 1
    next.trip.budget_per_person += proposal.delta
    next.events.unshift({ id: `local-${Date.now()}`, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), kind: 'plan', title: `Plan v${next.trip.version} accepted`, detail: `${proposal.summary} · ${pounds(proposal.delta)} pp` })
    setState(next); setProposal(null); setPrompt(''); showToast(`Plan v${next.trip.version} accepted`)
  }
  return <div className="plan-layout">
    <section className="card panel plan-main">
      <div className="plan-summary">
        <div><span className="status-locked"><LockKeyhole size={13} /> Locked plan</span><h2>{state.trip.location}</h2><p><MapPin size={15} /> Manchester → Keswick · {state.trip.dates}</p></div>
        <div className="budget-dial"><span>Per person</span><strong>{pounds(state.trip.budget_per_person, true)}</strong><small>of £450 comfort cap</small></div>
      </div>
      <Itinerary items={state.plan} detailed />
    </section>
    <aside className="plan-aside">
      <article className="card replan-card">
        <div className="replan-head"><span><Sparkles size={17} /></span><div><strong>Change the plan</strong><p>Ask in plain English</p></div></div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Try “Make Sunday more relaxed”" />
        <div className="prompt-chips"><button onClick={() => setPrompt('Drop the busiest stop')}>Drop a stop</button><button onClick={() => setPrompt('Add one chill morning')}>Add chill time</button></div>
        <button className="primary-button full" disabled={!prompt.trim() || thinking} onClick={replan}>{thinking ? 'Replanning…' : <>Replan with Pilot <Sparkles size={15} /></>}</button>
      </article>
      {proposal && <article className="proposal-card">
        <div className="proposal-label"><Bot size={15} /> Proposed v{state.trip.version + 1}</div>
        <h3>{proposal.summary}</h3>
        <div className="diff-line"><span>Cost change</span><strong className={proposal.delta <= 0 ? 'good' : ''}>{proposal.delta >= 0 ? '+' : ''}{pounds(proposal.delta)} pp</strong></div>
        <div className="proposal-actions"><button onClick={() => setProposal(null)}>Reject</button><button className="primary-button" onClick={accept}><Check size={15} /> Accept version</button></div>
      </article>}
      <article className="card versions-card"><div className="panel-heading"><div><p className="section-label">History</p><h3>Plan versions</h3></div></div>{[state.trip.version, state.trip.version - 1, state.trip.version - 2].map((version, i) => <div className="version-row" key={version}><span>v{version}</span><div><strong>{i === 0 ? 'Current plan' : i === 1 ? 'Added a slow morning' : 'Dropped Z Point'}</strong><p>{i === 0 ? 'Locked by Maya' : `Accepted · ${i + 1} days ago`}</p></div>{i === 0 ? <span className="current-pill">Current</span> : <ChevronRight size={15} />}</div>)}</article>
    </aside>
  </div>
}

function Checkout({ state, setState, persona, setPersona, showToast }: { state: DemoState; setState: (s: DemoState) => void; persona: string; setPersona: (id: string) => void; showToast: (m: string) => void }) {
  const [coverOpen, setCoverOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const currentMember = state.members.find((member) => member.id === persona) ?? state.members[0]
  const committed = state.members.filter((member) => member.committed).length
  const complete = committed === state.members.length

  const commit = async () => {
    if (currentMember.committed) { const waiting = state.members.find((member) => !member.committed); if (waiting) setPersona(waiting.id); return }
    setBusy(true)
    await api.paypalOrder().catch(() => ({ id: 'SIMULATED-ORDER', status: 'CREATED', simulated: true }))
    const remote = await api.commit(currentMember.id).catch(() => null)
    if (remote) setState(remote)
    else {
      const next = structuredClone(state); const member = next.members.find((row) => row.id === currentMember.id)!; member.committed = true
      next.checkout.state = next.members.every((row) => row.committed) ? 'booked' : 'open'
      next.events.unshift({ id: `local-${Date.now()}`, time: 'now', kind: 'payment', title: `${member.name} committed`, detail: 'Simulated PayPal authorization · up to £205' })
      if (next.checkout.state === 'booked') { next.plan[0].booked = true; next.events.unshift({ id: `book-${Date.now()}`, time: 'now', kind: 'booking', title: 'Cabin booked', detail: 'All commitments collected · confirmation FH-8842' }) }
      setState(next)
    }
    setBusy(false); showToast('Share authorised in the simulated PayPal sandbox')
  }
  const cover = async () => {
    const remote = await api.cover(persona, 'leo', state.checkout.share_cents).catch(() => null)
    if (remote) setState(remote)
    else { const next = structuredClone(state); next.members.find((m) => m.id === 'leo')!.committed = true; next.events.unshift({ id: `cover-${Date.now()}`, time: 'now', kind: 'cover', title: `${currentMember.name} covered Leo`, detail: 'Private agreement · due 29 Nov' }); setState(next) }
    setCoverOpen(false); showToast('Private cover agreement created')
  }
  return <div className="checkout-layout">
    <section className="card checkout-hero">
      <div className="checkout-hero-top"><div className="property-art"><span>FELL HOUSE</span><small>KESWICK</small></div><div className="property-copy"><span className={complete ? 'status-booked' : 'status-open'}>{complete ? 'Booked' : 'Collecting commitments'}</span><h2>{state.checkout.title}</h2><p>{state.checkout.vendor} · Entire home · sleeps 8</p><div className="property-facts"><span>3 bedrooms</span><i /> <span>6 beds</span><i /> <span>Free cancellation</span></div></div><div className="property-price"><strong>{pounds(state.checkout.total_cents, true)}</strong><span>total</span></div></div>
      <div className="checkout-maths"><div><span>Your share</span><strong>{pounds(state.checkout.share_cents, true)}</strong></div><div><span>You approve up to</span><strong>{pounds(state.checkout.cap_cents, true)}</strong></div><div><span>Commit by</span><strong>Today, 18:00</strong></div></div>
      <div className="approval-note"><ShieldCheck size={20} /><p><strong>Your control stays with you.</strong> The extra £15 is only a cap for a small price change or someone dropping out. You will see the final amount before capture.</p></div>
    </section>
    <section className="card commitments-panel">
      <div className="panel-heading"><div><p className="section-label">Group progress</p><h2>{committed} of {state.members.length} are in</h2></div><span className="deadline"><Clock3 size={14} /> 6h 18m left</span></div>
      <div className="big-progress"><span style={{ width: `${(committed / state.members.length) * 100}%` }} /></div>
      <div className="member-commit-list">{state.members.map((member) => <article key={member.id} className={member.committed ? 'committed' : ''}><Avatar member={member} /><div><strong>{member.name}{member.id === persona && ' · you'}</strong><p>{member.committed ? `Authorised up to ${pounds(state.checkout.cap_cents, true)}` : 'Waiting to commit'}</p></div>{member.committed ? <span className="commit-check"><Check size={15} /></span> : <button onClick={() => setPersona(member.id)}>View as {member.name}</button>}</article>)}</div>
    </section>
    <aside className="card commit-action">
      <div className="paypal-wordmark"><span>Pay</span><b>Pal</b></div>
      <h3>{currentMember.committed ? `${currentMember.name} is in.` : `Ready, ${currentMember.name}?`}</h3>
      <p>{currentMember.committed ? complete ? 'Everyone has committed. The cabin is now booked.' : 'Switch to the waiting member to finish the demo.' : `Authorise up to ${pounds(state.checkout.cap_cents, true)} with PayPal. This is a hold, not a charge.`}</p>
      <button className="paypal-button" disabled={busy || complete} onClick={commit}>{busy ? 'Opening PayPal…' : currentMember.committed ? 'View as waiting member' : `Commit ${pounds(state.checkout.share_cents, true)}`}</button>
      {!complete && <button className="cover-link" onClick={() => setCoverOpen(true)}>I need help paying</button>}
      <div className="secure-row"><LockKeyhole size={13} /> PayPal sandbox · encrypted</div>
    </aside>
    {coverOpen && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setCoverOpen(false)}><X size={18} /></button><span className="modal-icon"><Users size={22} /></span><h2>Cover a friend, privately.</h2><p>No group announcement. Leo confirms the amount and due date before anything is agreed.</p><div className="cover-summary"><span><Avatar member={currentMember} small />{currentMember.name} covers</span><ArrowRight size={17} /><span><Avatar member={state.members.find((m) => m.id === 'leo')!} small />Leo</span></div><label>Amount<strong>{pounds(state.checkout.share_cents, true)}</strong></label><label>Repay by<strong>29 November</strong></label><button className="primary-button full" onClick={cover}>Send private offer <Send size={15} /></button></div></div>}
  </div>
}

function Money({ state, setState, persona, showToast }: { state: DemoState; setState: (s: DemoState) => void; persona: string; showToast: (m: string) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const balances = useMemo(() => calculateBalances(state.expenses), [state.expenses])
  const settlements = useMemo(() => calculateSettlements(balances), [balances])
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? id
  const add = async () => {
    const cents = Math.round(Number(amount) * 100); if (!title || !cents) return
    const expense: Expense = { id: `e${Date.now()}`, title, payer: persona, amount_cents: cents, participants: state.members.map((m) => m.id), category: 'Other' }
    const remote = await api.expense(expense).catch(() => null)
    if (remote) setState(remote); else { const next = structuredClone(state); next.expenses.push(expense); next.balances = calculateBalances(next.expenses); next.settlements = calculateSettlements(next.balances); setState(next) }
    setOpen(false); setTitle(''); setAmount(''); showToast('Expense added and split to the penny')
  }
  return <div className="money-layout">
    <section className="card money-summary">
      <div><p className="section-label">Group spend</p><strong>{pounds(state.expenses.reduce((s, e) => s + e.amount_cents, 0), true)}</strong><span>across {state.expenses.length} expenses</span></div>
      <div><p className="section-label">Your position</p><strong className={(balances[persona] ?? 0) >= 0 ? 'good' : 'owed'}>{(balances[persona] ?? 0) >= 0 ? 'owed ' : 'you owe '}{pounds(Math.abs(balances[persona] ?? 0), true)}</strong><span>updated just now</span></div>
      <button className="primary-button" onClick={() => setOpen(true)}><Plus size={16} /> Add expense</button>
    </section>
    <section className="card panel expense-panel">
      <div className="panel-heading"><div><p className="section-label">Shared expenses</p><h2>The trip tab</h2></div><button className="soft-button"><ReceiptText size={15} /> Scan receipt</button></div>
      <div className="expense-table"><div className="expense-table-head"><span>Expense</span><span>Paid by</span><span>Split</span><span>Amount</span></div>{state.expenses.map((expense) => <div className="expense-row" key={expense.id}><span className="expense-name"><i><ReceiptText size={16} /></i><span><strong>{expense.title}</strong><small>{expense.category}</small></span></span><span>{memberName(expense.payer)}</span><span>{expense.participants.length} people</span><strong>{pounds(expense.amount_cents)}</strong></div>)}</div>
    </section>
    <aside className="card panel settle-panel"><p className="section-label">Smart settle-up</p><h2>{settlements.length} payments clear the group</h2><p>Pilot found the shortest route to zero balances.</p><div className="settlement-list">{settlements.map((transfer, index) => <div key={`${transfer.payer}-${transfer.recipient}`}><span className="settlement-number">{index + 1}</span><p><strong>{memberName(transfer.payer)}</strong> pays <strong>{memberName(transfer.recipient)}</strong></p><b>{pounds(transfer.cents)}</b></div>)}</div><button className="paypal-button">Settle with PayPal</button><span className="secure-row"><ShieldCheck size={13} /> Review every payment first</span></aside>
    {open && <div className="modal-backdrop"><div className="modal expense-modal"><button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button><span className="modal-icon"><ReceiptText size={22} /></span><h2>Add an expense</h2><p>Code—not the agent—will calculate the exact split in whole pennies.</p><label>What was it?<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday dinner" /></label><label>Amount (£)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label><div className="split-preview"><Users size={17} /><span>Split equally between all {state.members.length} friends</span></div><button className="primary-button full" onClick={add}>Add and split expense</button></div></div>}
  </div>
}

function Activity({ state }: { state: DemoState }) {
  return <div className="activity-layout"><section className="card panel"><div className="activity-filters"><button className="active">All activity</button><button>Plans</button><button>Approvals</button><button>Money moves</button></div><ActivityList events={state.events} /></section><aside className="activity-aside"><article className="card guardrail-card"><span><ShieldCheck size={21} /></span><h3>Money guardrails</h3><ul><li><Check size={14} /> Human approval required</li><li><Check size={14} /> Price must stay under cap</li><li><Check size={14} /> Unique request IDs</li><li><Check size={14} /> PayPal webhook verified</li></ul></article><article className="card explain-card"><Lightbulb size={19} /><h3>Why this matters</h3><p>Pilot can search, compare and remind on its own. It cannot hold, charge, refund or pay out money without the matching approval.</p></article></aside></div>
}

export default App
