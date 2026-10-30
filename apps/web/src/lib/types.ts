export type Member = {
  id: string
  name: string
  initials: string
  role: string
  color: string
  committed: boolean
}

export type PlanItem = {
  id: string
  day: number
  time: string
  title: string
  detail: string
  type: string
  cents: number
  booked: boolean
}

export type Expense = {
  id: string
  title: string
  payer: string
  amount_cents: number
  participants: string[]
  category: string
}

export type AgentEvent = {
  id: string
  time: string
  kind: string
  title: string
  detail: string
}

export type Transfer = { payer: string; recipient: string; cents: number }

export type PollOption = { id: string; label: string; votes: string[] }

export type TripPoll = {
  id: string
  question: string
  status: 'open' | 'decided'
  created_by: string
  options: PollOption[]
  winner_id?: string
}

export type ChatMessage = {
  id: string
  author: string
  kind: 'text' | 'summary' | 'warning' | 'suggestion' | 'poll'
  time: string
  text: string
  meta?: { decisions?: string[]; open?: string }
  poll_id?: string
}

export type TripGroup = {
  id: string
  name: string
  destination: string
  dates: string
  member_ids: string[]
  unread: number
  messages: ChatMessage[]
  polls: TripPoll[]
}

export type DemoState = {
  trip: {
    id: string
    name: string
    location: string
    dates: string
    status: string
    currency: string
    budget_per_person: number
    version: number
  }
  members: Member[]
  plan: PlanItem[]
  checkout: {
    id: string
    title: string
    vendor: string
    total_cents: number
    share_cents: number
    cap_cents: number
    deadline: string
    state: string
  }
  expenses: Expense[]
  events: AgentEvent[]
  balances: Record<string, number>
  settlements: Transfer[]
  mode: string
  groups: TripGroup[]
}

export type View = 'chat' | 'plan' | 'checkout' | 'money' | 'activity'
