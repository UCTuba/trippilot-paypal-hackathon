import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, AtSign, Bot, CalendarDays, Check, CheckCheck, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, GripVertical, Lightbulb, LockKeyhole, MapPin, MessageCircleMore,
  Paperclip, Plus, ReceiptText, RefreshCcw, Send, ShieldCheck, Sparkles, Users, Vote, WandSparkles, X,
} from 'lucide-react'
import { ActivityList } from './components/ActivityList'
import { Avatar } from './components/Avatar'
import { CheckoutCard } from './components/CheckoutCard'
import { Itinerary } from './components/Itinerary'
import { Payments } from './components/Payments'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { MemberBalances, SpendByCategory } from './components/TripCharts'
import { api } from './lib/api'
import { calculateBalances, calculateSettlements, pounds } from './lib/money'
import { freshSeed } from './lib/seed'
import type { ChatMessage, DemoState, Expense, TripGroup, TripPoll, View } from './lib/types'

const viewTitles: Record<View, { eyebrow: string; title: string; description: string }> = {
  chat: { eyebrow: 'Trip room', title: 'Plan it in the conversation.', description: 'Discuss, decide and let Pilot keep the shared plan honest.' },
  plan: { eyebrow: 'Plan v3 · locked', title: 'Three days, agreed together.', description: 'A slower Lake District weekend with enough room to breathe.' },
  checkout: { eyebrow: 'Payments', title: 'Personal when it should be. Shared when it must be.', description: 'Pay individual bookings directly, collect group shares, then let the admin complete the activity.' },
  money: { eyebrow: 'Trip tab', title: 'Every pound, accounted for.', description: 'Add shared expenses, see fair balances and settle with fewer transfers.' },
  activity: { eyebrow: 'Agent activity', title: 'Nothing happens in the dark.', description: 'Every proposal, approval, price check and payment step is recorded here.' },
}

function App() {
  const [state, setState] = useState<DemoState>(freshSeed)
  const [view, setView] = useState<View>('chat')
  const [persona, setPersona] = useState('maya')
  const [activeGroupId, setActiveGroupId] = useState('lake-crew')
  const [createOpen, setCreateOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    api.demo().then((data) => { setState(data); setIsOnline(true) }).catch(() => setIsOnline(false))
  }, [])

  const reset = async () => {
    const next = await api.reset().catch(() => freshSeed())
    setState(next)
    setView('chat')
    showToast('Demo reset to a fresh judging state')
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  const changeView = (next: View) => { setView(next); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const current = viewTitles[view]
  const activeGroup = state.groups.find((group) => group.id === activeGroupId) ?? state.groups[0]
  const selectGroup = (id: string) => { setActiveGroupId(id); setView('chat'); setSidebarOpen(false) }

  return (
    <div className="app-shell">
      <div className={sidebarOpen ? 'sidebar-wrap open' : 'sidebar-wrap'}>
        <Sidebar view={view} onChange={changeView} groups={state.groups} activeGroup={activeGroup.id} onGroup={selectGroup} onCreate={() => setCreateOpen(true)} />
        <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
      </div>
      <main className="main-shell">
        <Topbar members={state.members} persona={persona} onPersona={setPersona} onReset={reset} onMenu={() => setSidebarOpen(true)} groupName={activeGroup.name} />
        <div className={view === 'chat' ? 'page chat-page' : 'page'}>
          {view !== 'chat' && <div className="page-heading">
            <div><p className="eyebrow">{current.eyebrow}</p><h1>{current.title}</h1><p>{current.description}</p></div>
            <div className="mode-pill"><span className={isOnline ? 'live-dot' : 'demo-dot'} />{isOnline ? state.mode.replace('-', ' ') : 'local demo mode'}</div>
          </div>}
          {view === 'chat' && <ChatRoom state={state} setState={setState} group={activeGroup} persona={persona} onPlan={() => changeView('plan')} showToast={showToast} />}
          {view === 'plan' && <Plan state={state} setState={setState} showToast={showToast} />}
          {view === 'checkout' && <Payments state={state} setState={setState} persona={persona} showToast={showToast} />}
          {view === 'money' && <Money state={state} setState={setState} persona={persona} showToast={showToast} />}
          {view === 'activity' && <Activity state={state} />}
        </div>
      </main>
      {createOpen && <CreateGroupModal state={state} setState={setState} persona={persona} onClose={() => setCreateOpen(false)} onCreated={(id) => { setActiveGroupId(id); setView('chat'); setCreateOpen(false); showToast('New trip room created') }} />}
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  )
}

function localPilotMessage(group: TripGroup, text: string): { message: ChatMessage; poll?: TripPoll } {
  const command = text.toLowerCase()
  const id = `pilot-${Date.now()}`
  if (/summari[sz]e|summary/.test(command)) return { message: { id, author: 'pilot', kind: 'summary', time: 'now', text: 'You have agreed on Fell House, Catbells and keeping a slower Sunday. The unresolved decision is when to fit kayaking without rushing.', meta: { decisions: ['Fell House cabin', 'Catbells on Saturday', 'A slower Sunday'], open: 'Kayak timing' } } }
  if (/feasib|possible|check/.test(command)) return { message: { id, author: 'pilot', kind: 'warning', time: 'now', text: 'The Saturday sequence is not feasible: the hike ends around 14:00, kayak check-in closes at 14:30, and the transfer takes about 28 minutes. Move kayaking to Sunday or shorten the hike.' } }
  if (/suggest|idea|recommend/.test(command)) return { message: { id, author: 'pilot', kind: 'suggestion', time: 'now', text: 'Try a Sunday 10:00 kayak slot, then leave the afternoon open for Castlerigg. It keeps one relaxed morning and removes 42 minutes of Saturday travel.' } }
  const poll: TripPoll = { id: `poll-${Date.now()}`, question: 'Which direction should I use for the plan?', status: 'open', created_by: 'pilot', options: [
    { id: 'relaxed', label: 'Keep it relaxed', votes: [] }, { id: 'active', label: 'Fit in more activities', votes: [] }, { id: 'budget', label: 'Prioritise lower cost', votes: [] },
  ] }
  return { message: { id, author: 'pilot', kind: 'poll', time: 'now', text: 'I’m not confident which trade-off the group prefers, so I opened a poll before changing the plan.', poll_id: poll.id }, poll }
}

function ChatRoom({ state, setState, group, persona, onPlan, showToast }: { state: DemoState; setState: (state: DemoState) => void; group: TripGroup; persona: string; onPlan: () => void; showToast: (message: string) => void }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const members = group.member_ids.map((id) => state.members.find((member) => member.id === id)).filter(Boolean) as DemoState['members']
  const groupInitials = group.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  const member = (id: string) => state.members.find((row) => row.id === id)
  const updateGroup = (nextGroup: TripGroup) => setState({ ...state, groups: state.groups.map((row) => row.id === nextGroup.id ? nextGroup : row) })

  const send = async (override?: string) => {
    const text = (override ?? draft).trim()
    if (!text || sending) return
    setDraft(''); setSending(true)
    const optimistic = structuredClone(group)
    optimistic.messages.push({ id: `m-${Date.now()}`, author: persona, kind: 'text', time: 'now', text })
    updateGroup(optimistic)
    const remote = await api.message(group.id, persona, text).catch(() => null)
    if (remote) updateGroup(remote.group)
    else if (text.toLowerCase().includes('@pilot')) {
      const result = localPilotMessage(optimistic, text)
      optimistic.messages.push(result.message)
      if (result.poll) optimistic.polls.push(result.poll)
      updateGroup(optimistic)
    }
    setSending(false)
  }

  const vote = async (poll: TripPoll, optionId: string) => {
    const remote = await api.vote(group.id, poll.id, persona, optionId).catch(() => null)
    const next = structuredClone(group)
    const localPoll = next.polls.find((row) => row.id === poll.id)!
    if (remote) Object.assign(localPoll, remote)
    else {
      localPoll.options.forEach((option) => { option.votes = option.votes.filter((id) => id !== persona) })
      localPoll.options.find((option) => option.id === optionId)!.votes.push(persona)
      const count = localPoll.options.reduce((sum, option) => sum + option.votes.length, 0)
      if (count >= Math.max(2, Math.floor(group.member_ids.length / 2) + 1)) {
        const winner = [...localPoll.options].sort((a, b) => b.votes.length - a.votes.length)[0]
        localPoll.status = 'decided'; localPoll.winner_id = winner.id
      }
    }
    const updatedState = { ...state, groups: state.groups.map((row) => row.id === next.id ? next : row) }
    if (localPoll.status === 'decided' && localPoll.id === 'poll-kayak' && localPoll.winner_id === 'sun') {
      const updatedPlan = state.plan.map((item) => item.id === 'kayak' ? { ...item, day: 3, time: '10:00', detail: '2 hrs · moved by group vote' } : item)
      if (!next.messages.some((message) => message.id === 'vote-applied')) next.messages.push({ id: 'vote-applied', author: 'pilot', kind: 'suggestion', time: 'now', text: 'Vote decided. I moved kayaking to Sunday at 10:00 and re-checked the route. The plan is feasible with a 45-minute buffer.' })
      setState({ ...updatedState, plan: updatedPlan, groups: updatedState.groups.map((row) => row.id === next.id ? next : row) })
      showToast('Group vote applied to the shared plan')
    } else setState(updatedState)
  }

  const command = (text: string) => { setDraft(text); window.setTimeout(() => send(text), 0) }

  return <div className="room-shell">
    <section className="conversation-card">
      <header className="room-header">
        <div className="room-title-mark">{groupInitials}</div>
        <div><p className="eyebrow">{group.destination} · {group.dates}</p><h1>{group.name}</h1><span><i /> {members.length} friends planning now</span></div>
        <div className="room-members">{members.slice(0, 5).map((row) => <Avatar member={row} small key={row.id} />)}{members.length > 5 && <b>+{members.length - 5}</b>}</div>
      </header>
      <div className="room-context-strip"><span><MessageCircleMore size={14} /> Discussion</span><button onClick={onPlan}><CalendarDays size={14} /> Shared plan · v{state.trip.version}</button><button><Users size={14} /> {members.length} members</button></div>
      <div className="message-stream">
        <div className="date-divider"><span>Today · planning the shape of the trip</span></div>
        {group.messages.map((message) => {
          const author = member(message.author)
          if (message.author === 'pilot') return <article key={message.id} className={`pilot-message pilot-${message.kind}`}>
            <div className="pilot-identity"><span><WandSparkles size={15} /></span><strong>TripPilot</strong><small>called by the group · {message.time}</small></div>
            <p>{message.text}</p>
            {message.kind === 'summary' && message.meta && <div className="decision-summary"><div><CheckCheck size={15} /><span><strong>Decided</strong>{message.meta.decisions?.join(' · ')}</span></div><div><Vote size={15} /><span><strong>Still open</strong>{message.meta.open}</span></div></div>}
            {message.kind === 'warning' && <div className="warning-foot"><AlertTriangle size={14} /> Feasibility check · live travel times</div>}
            {message.kind === 'suggestion' && <button className="apply-suggestion"><Check size={14} /> Add to shared plan</button>}
          </article>
          return <article className={message.author === persona ? 'chat-message mine' : 'chat-message'} key={message.id}>
            {author && <Avatar member={author} small />}
            <div><div className="message-meta"><strong>{author?.name ?? message.author}</strong><time>{message.time}</time></div><p>{message.text}</p></div>
          </article>
        })}
        {group.polls.map((poll) => <PollCard key={poll.id} poll={poll} members={state.members} persona={persona} onVote={(option) => vote(poll, option)} />)}
        {group.messages.length === 0 && <div className="empty-room"><span><MessageCircleMore size={24} /></span><h2>Start with the rough idea.</h2><p>Dates, a destination, a budget—or just “somewhere warm.” The plan can grow from the conversation.</p></div>}
      </div>
      <div className="pilot-shortcuts"><span><AtSign size={13} /> Call Pilot</span><button onClick={() => command('@pilot summarise what we have decided')}>Summarise</button><button onClick={() => command('@pilot check if our current plan is feasible')}>Check feasibility</button><button onClick={() => command('@pilot suggest the best next step')}>Suggest next</button></div>
      <div className="composer"><button aria-label="Attach"><Paperclip size={18} /></button><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder={`Message ${group.name} — type @pilot to call the agent`} /><button className="send-button" onClick={() => send()} disabled={!draft.trim() || sending}><Send size={17} /></button></div>
      <p className="composer-note">Pilot only joins when called. Every plan change stays visible to the group.</p>
    </section>
    <aside className="live-plan-rail">
      <div className="live-plan-head"><div><p className="section-label">Living itinerary</p><h2>The plan so far</h2></div><button onClick={onPlan}>Open <ArrowRight size={14} /></button></div>
      <div className="plan-health"><span><ShieldCheck size={15} /> Feasibility</span><strong>1 issue</strong></div>
      <div className="rail-days">{[1,2,3].map((day) => <section key={day}><div className="rail-day-head"><span>0{day}</span><strong>{day === 1 ? 'Friday' : day === 2 ? 'Saturday' : 'Sunday'}</strong><button><Plus size={13} /></button></div>{state.plan.filter((item) => item.day === day).map((item) => <article key={item.id}><GripVertical size={13} /><time>{item.time}</time><div><strong>{item.title}</strong><small>{item.detail}</small></div>{item.id === 'kayak' && item.day === 2 && <AlertTriangle size={14} className="rail-warning" />}</article>)}</section>)}</div>
      <div className="plan-budget-row"><span><CircleDollarSign size={15} /> Estimated per person</span><strong>{pounds(state.trip.budget_per_person, true)}</strong></div>
      <button className="lock-plan-button" onClick={onPlan}><LockKeyhole size={14} /> Review and lock plan</button>
    </aside>
  </div>
}

function PollCard({ poll, members, persona, onVote }: { poll: TripPoll; members: DemoState['members']; persona: string; onVote: (optionId: string) => void }) {
  const total = poll.options.reduce((sum, option) => sum + option.votes.length, 0)
  const currentVote = poll.options.find((option) => option.votes.includes(persona))
  const [changingVote, setChangingVote] = useState(!currentVote)
  const isClosed = poll.status === 'decided'
  const choose = (optionId: string) => { onVote(optionId); setChangingVote(false) }
  return <article className={poll.status === 'decided' ? 'poll-card decided' : 'poll-card'}>
    <div className="poll-kicker"><Vote size={15} /><span>Group decision</span><small>{poll.status === 'decided' ? 'Decided' : `${total} voted`}</small></div>
    <h3>{poll.question}</h3>
    <div className="poll-options">{poll.options.map((option) => {
      const selected = option.votes.includes(persona)
      const percent = total ? Math.round(option.votes.length / total * 100) : 0
      const voters = members.filter((member) => option.votes.includes(member.id))
      return <button key={option.id} onClick={() => choose(option.id)} disabled={isClosed || (!!currentVote && !changingVote)} className={selected || poll.winner_id === option.id ? 'selected' : ''} aria-label={`${option.label}, ${option.votes.length} votes${selected ? ', your current vote' : ''}`}>
        <span className="poll-radio">{selected || poll.winner_id === option.id ? <Check size={12} /> : ''}</span>
        <span className="poll-option-copy"><strong>{option.label}</strong>{voters.length > 0 && <small>{voters.map((member) => member.name).join(', ')}</small>}</span>
        <i style={{ width: `${percent}%` }} />
        <b>{percent}%</b>
      </button>
    })}</div>
    <div className="poll-footer">
      <div className="poll-voters">{members.filter((member) => poll.options.some((option) => option.votes.includes(member.id))).map((member) => <Avatar member={member} small key={member.id} />)}<span>{isClosed ? 'Plan updated from the winning option' : `${Math.max(0, members.length - total)} still to vote`}</span></div>
      {!isClosed && currentVote && !changingVote && <button className="change-vote" onClick={() => setChangingVote(true)}><RefreshCcw size={13} /> Change vote</button>}
      {!isClosed && currentVote && changingVote && <button className="change-vote cancel" onClick={() => setChangingVote(false)}>Keep current</button>}
    </div>
  </article>
}

function CreateGroupModal({ state, setState, persona, onClose, onCreated }: { state: DemoState; setState: (state: DemoState) => void; persona: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [dates, setDates] = useState('')
  const create = async () => {
    if (!name.trim() || !destination.trim() || !dates.trim()) return
    const remote = await api.createGroup({ name, destination, dates, created_by: persona }).catch(() => null)
    const group: TripGroup = remote ?? { id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`, name, destination, dates, member_ids: [persona], unread: 0, messages: [{ id: 'welcome', author: 'pilot', kind: 'summary', time: 'now', text: 'Your trip room is ready. Add the rough plan or call @pilot when you want suggestions, a summary, or a feasibility check.' }], polls: [] }
    setState({ ...state, groups: [...state.groups, group] }); onCreated(group.id)
  }
  return <div className="modal-backdrop"><div className="modal create-group-modal"><button className="modal-close" onClick={onClose}><X size={18} /></button><span className="modal-icon"><MessageCircleMore size={22} /></span><p className="eyebrow">New trip room</p><h2>Who are we planning with?</h2><p>Start with a name and a rough idea. Everything else can emerge from the chat.</p><label>Group name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Summer escape crew" /></label><label>Destination or idea<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="e.g. Somewhere warm" /></label><label>Dates or rough window<input value={dates} onChange={(event) => setDates(event.target.value)} placeholder="e.g. First weekend in June" /></label><button className="primary-button full" onClick={create} disabled={!name || !destination || !dates}>Create trip room <ArrowRight size={15} /></button></div></div>
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
    <section className="money-visuals" aria-label="Trip spending charts">
      <SpendByCategory expenses={state.expenses} />
      <MemberBalances balances={balances} members={state.members} />
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
