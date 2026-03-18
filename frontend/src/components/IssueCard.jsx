import { useState } from 'react'
import { MapPin, Calendar, User, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
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

// Converts the stored relative path (e.g. "tickets/2026/03/photo.jpg")
// or a legacy full Azure URL into a backend proxy URL so the browser
// never calls Azure directly (private container would 403).
function photoUrl(photo) {
  if (!photo) return null
  if (photo.startsWith('http')) {
    const match = photo.match(/maintenance-photos\/(.+?)(\?|$)/)
    return match ? `/api/photos/${match[1]}/` : null
  }
  return `/api/photos/${photo}/`
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
            color: '#1e293b',
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

/* Photo slider used in the grid card when a ticket has multiple photos */
function PhotoSlider({ photos, title }) {
  const [idx, setIdx] = useState(0)
  const prev = (e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i - 1 + photos.length) % photos.length) }
  const next = (e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i + 1) % photos.length) }

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
    <div className="relative w-full h-36 rounded overflow-hidden shrink-0">
      <img
        src={photos[idx]}
        alt={`${title} — photo ${idx + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {photos.length > 1 && (
        <>
          {/* Prev / Next */}
          <button
            onClick={prev}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <ChevronLeft size={14} className="text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <ChevronRight size={14} className="text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i) }}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: i === idx ? '#fff' : 'rgba(255,255,255,0.45)' }}
              />
            ))}
          </div>

          {/* Counter badge */}
          <span
            className="absolute top-1.5 right-1.5 text-white text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', fontSize: '10px' }}
          >
            {idx + 1}/{photos.length}
          </span>
        </>
      )}
    </div>
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

  // Collect all up to 5 photo fields
  const photos = ['photo', 'photo2', 'photo3', 'photo4', 'photo5']
    .map((k) => photoUrl(issue[k]))
    .filter(Boolean)

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

        {/* Right: status + date + ID + track */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={issue.status || 'pending'} size="sm" />
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={10} />
              {formatDate(issue.created_at)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{issue.id}</span>
          </div>
          <Link
            to={`/track/${issue.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--accent)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Track <ArrowRight size={10} />
          </Link>
        </div>
      </article>
    )
  }

  /* ── Standard vertical card (grid / map sidebar view) ─────────── */
  return (
    <article className="issue-card group relative hover:z-[60]" style={{ overflow: 'visible' }}>
      {/* Photo slider or icon placeholder */}
      {photos.length > 0 ? (
        <PhotoSlider photos={photos} title={issue.title} />
      ) : (
        <div
          className="w-full h-36 rounded overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: cat.bgColor }}
        >
          <div className="flex flex-col items-center gap-2 opacity-40">
            <CatIcon size={28} style={{ color: cat.color }} />
            <span className="text-xs" style={{ color: cat.color }}>No photo</span>
          </div>
        </div>
      )}

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

        {/* Description — hover to see full text if truncated */}
        {issue.description && (
          <div className="group/desc relative cursor-default">
            <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {issue.description}
            </p>
            <div
              className="absolute left-0 bottom-full mb-2 z-50 pointer-events-none
                         opacity-0 invisible group-hover/desc:opacity-100 group-hover/desc:visible
                         transition-all duration-150"
              style={{ minWidth: '200px', maxWidth: '280px' }}
            >
              <div
                className="rounded-lg px-3 py-2 text-xs shadow-2xl"
                style={{
                  backgroundColor: '#ffffff',
                  border: `1px solid ${cat.color}50`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  color: '#1e293b',
                  wordBreak: 'break-word',
                }}
              >
                {issue.description}
              </div>
              <span
                className="block w-2 h-2 rotate-45 ml-3 -mt-1"
                style={{ backgroundColor: '#ffffff', border: `1px solid ${cat.color}50`, borderTop: 'none', borderLeft: 'none' }}
              />
            </div>
          </div>
        )}

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
          <Link
            to={`/track/${issue.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 ml-auto font-medium transition-opacity"
            style={{ color: 'var(--accent)', fontSize: '11px' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Track <ArrowRight size={10} />
          </Link>
        </div>
      </div>
    </article>
  )
}