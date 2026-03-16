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

/* Small popup that appears above truncated location text — like a map popup */
function LocationTooltip({ location, color }) {
  if (!location) return null
  return (
    <span className="group/loc relative flex items-center gap-1 cursor-default min-w-0">
      <MapPin size={10} className="shrink-0" />
      <span className="truncate">{location}</span>

      {/* Popup — only visible on hover of this span */}
      <span
        className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none
                   opacity-0 invisible group-hover/loc:opacity-100 group-hover/loc:visible
                   transition-all duration-150"
        style={{ minWidth: '180px', maxWidth: '280px' }}
      >
        <span
          className="flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs shadow-2xl"
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${color}50`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            color: 'var(--text-primary)',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            display: 'inline-flex',
          }}
        >
          <MapPin size={11} className="shrink-0 mt-0.5" style={{ color }} />
          {location}
        </span>
        {/* Caret */}
        <span
          className="block w-2 h-2 rotate-45 ml-3 -mt-1"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${color}50`, borderTop: 'none', borderLeft: 'none' }}
        />
      </span>
    </span>
  )
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
      <article className="gov-row flex items-center gap-4 py-3 px-4">

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
          <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
            {issue.location_description && (
              <LocationTooltip location={issue.location_description} color={cat.color} />
            )}
            <span className="flex items-center gap-1">
              <User size={10} />
              {issue.reporter_name || 'Anonymous'}
            </span>
          </div>
        </div>

        {/* Right: status + date + ID */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={issue.status || 'pending'} size="sm" />
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
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
    <article className="issue-card group relative hover:z-[60]" style={{ overflow: 'visible' }}>
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
          className="flex flex-wrap gap-x-4 gap-y-1 mt-auto pt-3 text-xs"
          style={{ borderTop: '1px solid var(--divider)', color: 'var(--text-muted)' }}
        >
          {issue.location_description && (
            <LocationTooltip location={issue.location_description} color={cat.color} />
          )}
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {formatDate(issue.created_at)}
          </span>
          {issue.reporter_name ? (
            <span className="flex items-center gap-1">
              <User size={11} />
              {issue.reporter_name}
            </span>
          ) : (
            <span className="flex items-center gap-1 italic">
              <User size={11} />
              Anonymous
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
