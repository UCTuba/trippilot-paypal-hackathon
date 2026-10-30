import type { Member } from '../lib/types'

export function Avatar({ member, small = false }: { member: Member; small?: boolean }) {
  return <span className={`avatar avatar-${member.color} ${small ? 'avatar-small' : ''}`} title={member.name}>{member.initials}</span>
}

