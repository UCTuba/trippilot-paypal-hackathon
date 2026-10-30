import type { DemoState, TripGroup, TripPoll } from './types'

const base = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export const api = {
  demo: () => request<DemoState>('/api/demo'),
  reset: () => request<DemoState>('/api/reset', { method: 'POST' }),
  replan: (prompt: string) => request<{ version: number; summary: string; delta_cents: number }>('/api/replan', { method: 'POST', body: JSON.stringify({ prompt }) }),
  commit: (memberId: string) => request<DemoState>(`/api/commit/${memberId}`, { method: 'POST' }),
  cover: (lender: string, borrower: string, amount_cents: number) => request<DemoState>('/api/cover', { method: 'POST', body: JSON.stringify({ lender, borrower, amount_cents }) }),
  expense: (payload: object) => request<DemoState>('/api/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  paypalOrder: () => request<{ id: string; status: string; simulated?: boolean }>('/api/paypal/orders', { method: 'POST' }),
  contributePayment: (paymentId: string, member_id: string) => request<DemoState>(`/api/payments/${paymentId}/contribute`, { method: 'POST', body: JSON.stringify({ member_id }) }),
  completeIndividualPayment: (paymentId: string, member_id: string) => request<DemoState>(`/api/payments/${paymentId}/complete-individual`, { method: 'POST', body: JSON.stringify({ member_id }) }),
  payPaymentVendor: (paymentId: string, member_id: string) => request<DemoState>(`/api/payments/${paymentId}/pay-vendor`, { method: 'POST', body: JSON.stringify({ member_id }) }),
  createGroup: (payload: { name: string; destination: string; dates: string; created_by: string }) => request<TripGroup>('/api/groups', { method: 'POST', body: JSON.stringify(payload) }),
  message: (groupId: string, author: string, text: string) => request<{ group: TripGroup }>(`/api/groups/${groupId}/messages`, { method: 'POST', body: JSON.stringify({ author, text }) }),
  vote: (groupId: string, pollId: string, member_id: string, option_id: string) => request<TripPoll>(`/api/groups/${groupId}/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ member_id, option_id }) }),
}
