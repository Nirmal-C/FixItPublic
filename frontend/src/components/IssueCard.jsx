import { MapPin, Calendar, User, ChevronRight, Image } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { CATEGORY_MAP } from '../utils/constants'
import * as LucideIcons from 'lucide-react'

// NZ date format (e.g. "5 Mar 2025") — Intl handles locale-specific formatting
// so we don't have to hardcode day/month ordering.
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(dateStr))
}

export default function IssueCard({ issue }) {
  // Look up the category config by ID. If the backend sends a category we don't
  // recognise (e.g. a new one added later), fall back gracefully instead of crashing.
  const cat = CATEGORY_MAP[issue.category] || {
    label: issue.category,
    color: '#94a3b8',
    bgColor: 'rgba(148,163,184,0.1)',
    icon: 'HelpCircle',
  }
  // Lucide exports all icons as named exports, so we can look them up by string.
  // This lets the category config in constants.js drive which icon gets rendered
  // without needing a manual switch statement here.
  const CatIcon = LucideIcons[cat.icon] || LucideIcons.HelpCircle

  return (
    <article className="issue-card group">
      <div
        className="w-full h-36 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
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

      <div className="flex flex-col gap-3 flex-1">
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
          <span className="text-xs text-slate-500 shrink-0">#{issue.id}</span>
        </div>

        <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
          {issue.title}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {issue.description}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-auto pt-1 border-t border-white/[0.06]">
          {issue.location_description && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate max-w-[140px]">{issue.location_description}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar size={11} />
            {formatDate(issue.created_at)}
          </span>
          {issue.reporter_name && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <User size={11} />
              {issue.reporter_name}
            </span>
          )}
          {!issue.reporter_name && (
            <span className="flex items-center gap-1 text-xs text-slate-600 italic">
              <User size={11} />
              Anonymous
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
