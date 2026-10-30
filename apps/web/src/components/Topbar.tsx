import { Bell, ChevronDown, Menu, RotateCcw } from 'lucide-react'
import type { Member } from '../lib/types'
import { Avatar } from './Avatar'

export function Topbar({ members, persona, onPersona, onReset, onMenu, groupName }: {
  members: Member[]
  persona: string
  onPersona: (id: string) => void
  onReset: () => void
  onMenu: () => void
  groupName?: string
}) {
  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div className="crumb"><span>Trip rooms</span><b>/</b><strong>{groupName ?? 'The Lake Crew'}</strong></div>
      <div className="top-actions">
        <button className="reset-button" onClick={onReset}><RotateCcw size={15} /> Reset demo</button>
        <button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
        <label className="persona-select">
          <Avatar member={members.find((member) => member.id === persona) ?? members[0]} small />
          <select aria-label="View as persona" value={persona} onChange={(event) => onPersona(event.target.value)}>
            {members.map((member) => <option key={member.id} value={member.id}>View as {member.name}</option>)}
          </select>
          <ChevronDown size={15} />
        </label>
      </div>
    </header>
  )
}
