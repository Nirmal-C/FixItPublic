import { Clock, Wrench, CheckCircle2, XCircle } from 'lucide-react'
import { STATUS_MAP } from '../utils/constants'

const ICON_MAP = { Clock, Wrench, CheckCircle2, XCircle }

export default function StatusBadge({ status, size = 'md' }) {
  const s = STATUS_MAP[status] || {
    label: status,
    color: '#94a3b8',
    bgColor: 'rgba(148,163,184,0.1)',
    borderColor: 'rgba(148,163,184,0.3)',
    icon: 'Clock',
  }

  const Icon = ICON_MAP[s.icon] || Clock
  const iconSize = size === 'sm' ? 11 : 13

  return (
    <span
      className={`badge border font-semibold ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{
        color: s.color,
        background: s.bgColor,
        borderColor: s.borderColor,
      }}
    >
      <Icon size={iconSize} />
      {s.label}
    </span>
  )
}
