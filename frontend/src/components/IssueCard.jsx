import { MapPin, Calendar, User } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { CATEGORY_MAP } from '../utils/constants'
import * as LucideIcons from 'lucide-react'

// NZ date format (e.g. "5 Mar 2025")
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(dateStr))
}

export default function IssueCard({ issue, compact = false }) {
  const cat = CATEGORY_MAP[issue.category] || {
    label: issue.category,
    color: '#8BA8C4',
    bgColor: 'rgba(139,168,196,0.10)',
    icon: 'HelpCircle',
  }
  const CatIcon = LucideIcons[cat.icon] || LucideIcons.HelpCircle

  /* ── Compact horizontal row (list view) ───────────────────────── */
  if (compact) {
    return (
      <article className="gov-row group flex items-center gap-4 py-3 px-4">

        {/* Category icon square */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: cat.bgColor }}
        >
          <CatIcon size={16} style={{ color: cat.color }} />
        </div>

        {/* Middle: title + meta */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {issue.title}
            </h3>
            <span
              className="badge border text-xs shrink-0"
              style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
            >
              <CatIcon size={10} />
              {cat.label}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {issue.location_description && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={10} className="shrink-0" />
                <span className="truncate max-w-[200px]">{issue.location_description}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <User size={10} />
              {issue.reporter_name || 'Anonymous'}
            </span>
          </div>
        </div>

        {/* Right: status + date + ID */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={issue.status || 'pending'} size="sm" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={10} />
              {formatDate(issue.created_at)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{issue.id}</span>
          </div>
        </div>
      </article>
    )
  }

  /* ── Standard vertical card (grid / map sidebar view) ─────────── */
  return (
    <article className="issue-card group">
      {/* Photo / icon thumbnail */}
      <div
        className="w-full h-36 rounded overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: cat.bgColor }}
      >
        {issue.photo ? (
          <img
            src={issue.photo}
            alt={issue.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <CatIcon size={28} style={{ color: cat.color }} />
            <span className="text-xs" style={{ color: cat.color }}>No photo</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 flex-1">
        {/* Category badge + status + ID */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="badge border text-xs"
              style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
            >
              <CatIcon size={11} />
              {cat.label}
            </span>
            <StatusBadge status={issue.status || 'pending'} size="sm" />
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
            #{issue.id}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-semibold line-clamp-2 leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {issue.title}
        </h3>

        {/* Description */}
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {issue.description}
        </p>

        {/* Meta footer */}
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 mt-auto pt-3"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          {issue.location_description && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={11} className="shrink-0" />
              <span className="truncate max-w-[140px]">{issue.location_description}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={11} />
            {formatDate(issue.created_at)}
          </span>
          {issue.reporter_name ? (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <User size={11} />
              {issue.reporter_name}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs italic" style={{ color: 'var(--text-muted)' }}>
              <User size={11} />
              Anonymous
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
