import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2, Clock, Wrench, Search, MapPin, User,
  BrainCircuit, Sparkles, ArrowLeft, RefreshCw,
  FileText, LogIn, Image as ImageIcon, X,
} from 'lucide-react'
import { CATEGORY_MAP, MOCK_CREWS } from '../utils/constants'
import { requestsApi } from '../api/client'
import { useCitizenAuth } from '../contexts/CitizenAuthContext'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

const STATUS_STEPS = [
  { key: 'submitted',   label: 'Submitted',       icon: CheckCircle2, doneIf: ['pending', 'in_progress', 'resolved', 'closed'] },
  { key: 'triage',      label: 'AI Triage',        icon: BrainCircuit, doneIf: ['pending', 'in_progress', 'resolved', 'closed'] },
  { key: 'assigned',    label: 'Crew Assigned',    icon: User,         doneIf: ['in_progress', 'resolved', 'closed'] },
  { key: 'in_progress', label: 'Work in Progress', icon: Wrench,       doneIf: ['in_progress', 'resolved', 'closed'] },
  { key: 'resolved',    label: 'Resolved',         icon: CheckCircle2, doneIf: ['resolved', 'closed'] },
]

const PRIORITY_MAP = {
  road:          { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  bus_stop:      { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  streetlight:   { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  footpath:      { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  public_toilet: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  park:          { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  graffiti:      { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  other:         { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const REASONING_MAP = {
  road:          'Road damage detected. High traffic impact and potential safety risk — expedited review queued.',
  bus_stop:      'Infrastructure damage identified. Public safety concern flagged — high priority assigned.',
  streetlight:   'Lighting fault detected. Scheduled for nearest available electrical crew.',
  footpath:      'Footpath obstruction identified. Accessibility impact noted — medium priority assigned.',
  public_toilet: 'Public amenity issue logged. Maintenance team notified — medium priority.',
  park:          'Park facility issue logged. Scheduled for next available maintenance window.',
  graffiti:      'Graffiti removal queued. Crew assigned based on proximity and workload.',
  other:         'General issue logged. Routed to general maintenance team for review.',
}

// Convert a stored relative path or legacy Azure URL to a backend proxy URL
function photoUrl(photo) {
  if (!photo) return null
  if (photo.startsWith('http')) {
    const match = photo.match(/maintenance-photos\/(.+?)(\?|$)/)
    return match ? `/api/photos/${match[1]}/` : null
  }
  return `/api/photos/${photo}/`
}

function formatDate(str) {
  if (!str) return '—'
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(str))
}

// ── Photo gallery lightbox component ──────────────────────────────────────

function PhotoGallery({ photos }) {
  const [lightbox, setLightbox] = useState(null) // index of open photo, or null

  return (
    <div className="glass p-5 flex flex-col gap-3 animate-slide-up">
      <div className="flex items-center gap-2">
        <ImageIcon size={14} className="text-indigo-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          Photos ({photos.length})
        </span>
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(i)}
            className="relative rounded-lg overflow-hidden border border-white/10 aspect-square focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:opacity-90 transition-opacity"
          >
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setLightbox(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-white" />
          </button>

          {/* Prev / Next */}
          {lightbox > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white text-lg font-bold"
              aria-label="Previous"
            >‹</button>
          )}
          {lightbox < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white text-lg font-bold"
              aria-label="Next"
            >›</button>
          )}

          {/* Full image */}
          <img
            src={photos[lightbox]}
            alt={`Photo ${lightbox + 1}`}
            className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            {lightbox + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  )
}

// ── My Tickets list (shown when logged in + no ID in URL) ──────────────────

function MyTicketsList() {
  const navigate = useNavigate()
  const { user } = useCitizenAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await requestsApi.mine()
      const data = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setTickets(data)
    } catch {
      setError('Could not load your reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="section-container py-10 animate-fade-in">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100">My Reports</h1>
            <p className="mt-1 text-slate-400 text-sm">
              Reports submitted by <span className="text-indigo-400 font-medium">{user?.username}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="btn-ghost flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link to="/report" className="btn-primary text-sm px-4 py-2">
              New Report
            </Link>
          </div>
        </div>

        {/* Also search by ID */}
        <TrackSearchForm compact />

        {/* Tickets list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass p-5">
                <div className="skeleton h-4 rounded w-1/2 mb-2" />
                <div className="skeleton h-3 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass p-6 text-center">
            <p className="text-slate-400 text-sm">{error}</p>
            <button onClick={load} className="btn-secondary mt-3 text-sm">Retry</button>
          </div>
        ) : tickets.length === 0 ? (
          <div
            className="glass p-10 flex flex-col items-center gap-4 text-center"
            style={{ border: '1px dashed var(--card-border)' }}
          >
            <FileText size={32} className="text-slate-600" />
            <div>
              <p className="text-slate-300 font-medium">No reports yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Your submitted reports will appear here so you can track their progress.
              </p>
            </div>
            <Link to="/report" className="btn-primary text-sm px-5 py-2.5">
              Submit Your First Report
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((t) => {
              const cat = CATEGORY_MAP[t.category] || { label: t.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)' }
              return (
                <div
                  key={t.id}
                  className="glass p-5 flex flex-col gap-3 cursor-pointer transition-all duration-150 hover:scale-[1.01]"
                  style={{ border: '1px solid var(--card-border)' }}
                  onClick={() => navigate(`/track/${t.id}`)}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold text-indigo-400">Report #{t.id}</span>
                      <p className="text-sm font-medium text-slate-100 truncate">{t.title}</p>
                    </div>
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span
                      className="badge border text-xs px-2 py-0.5"
                      style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
                    >
                      {cat.label}
                    </span>
                    {t.location_description && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {t.location_description}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {formatDate(t.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Search form (shown when not logged in, or as secondary on My Reports) ──

function TrackSearchForm({ compact = false }) {
  const [id, setId] = useState('')
  const navigate = useNavigate()
  const { isAuthenticated } = useCitizenAuth()

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = id.trim()
    if (trimmed) navigate(`/track/${trimmed}`)
  }

  if (compact) {
    return (
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Track a specific report by ID…"
          className="form-input flex-1 text-sm py-2"
        />
        <button type="submit" className="btn-secondary px-4 py-2 text-sm shrink-0 gap-1.5">
          <Search size={13} />
          Track
        </button>
      </form>
    )
  }

  return (
    <div className="section-container py-20">
      <div className="max-w-lg mx-auto flex flex-col items-center gap-8 text-center animate-slide-up">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
            border: '2px solid rgba(99,102,241,0.4)',
          }}
        >
          <Search size={36} className="text-indigo-400" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-100">Track Your Report</h1>
          <p className="mt-2 text-slate-400">
            Enter your report ID to check the current status and crew assignment.
          </p>
        </div>

        <form onSubmit={handleSearch} className="w-full flex gap-2">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Enter your report ID (e.g. 42)"
            className="form-input flex-1"
            autoFocus
          />
          <button type="submit" className="btn-primary px-5 py-2.5 shrink-0">
            Track
          </button>
        </form>

        {!isAuthenticated && (
          <div
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <LogIn size={15} className="text-indigo-400 shrink-0" />
            <p className="text-sm text-slate-300 text-left">
              <Link to="/login" className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 font-medium">
                Sign in
              </Link>{' '}
              to see all your submitted reports in one place.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Your report ID was shown on the submission confirmation page.
        </p>
      </div>
    </div>
  )
}

// ── Ticket detail tracker ──────────────────────────────────────────────────

function TicketTracker({ id }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setNotFound(false)
    try {
      const res = await requestsApi.get(id)
      setTicket(res.data)
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true)
      else setNotFound(true) // treat any error as not found for public users
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="section-container py-20 flex flex-col items-center gap-4 animate-fade-in">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.1)', border: '2px solid rgba(99,102,241,0.3)' }}
        >
          <BrainCircuit size={30} className="text-indigo-400" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <p className="text-slate-400 text-sm">Looking up report #{id}…</p>
      </div>
    )
  }

  if (notFound || !ticket) {
    return (
      <div className="section-container py-20">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-6 text-center animate-slide-up">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)' }}
          >
            <Clock size={36} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100">Report #{id}</h1>
            <p className="mt-2 text-slate-400">
              We couldn't find a report with this ID. Please double-check and try again.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button onClick={() => navigate('/track')} className="btn-secondary flex-1 py-2.5 gap-2">
              <Search size={14} /> Try another ID
            </button>
            <Link to="/report" className="btn-primary flex-1 py-2.5 text-center">
              New Report
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const cat = CATEGORY_MAP[ticket.category] || { label: ticket.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)' }
  const priority = PRIORITY_MAP[ticket.category] || PRIORITY_MAP.other
  const crew = MOCK_CREWS.find((c) => c.id === ticket.assigned_crew)
  const reasoning = REASONING_MAP[ticket.category] || REASONING_MAP.other

  // Collect all non-null photo URLs from the ticket (photo through photo5)
  const photos = ['photo', 'photo2', 'photo3', 'photo4', 'photo5']
    .map((k) => photoUrl(ticket[k]))
    .filter(Boolean)

  return (
    <div className="section-container py-10 animate-fade-in">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Back + refresh */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/track')} className="btn-ghost flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
            <ArrowLeft size={14} /> My Reports
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-ghost flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Header card */}
        <div className="glass p-5 flex flex-col gap-3 animate-slide-up">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-indigo-400">Report #{ticket.id}</span>
              <h1 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {ticket.title}
              </h1>
            </div>
            <StatusBadge status={ticket.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {ticket.location_description && (
              <span className="flex items-center gap-1">
                <MapPin size={11} className="shrink-0" /> {ticket.location_description}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={11} className="shrink-0" /> Submitted {formatDate(ticket.created_at)}
            </span>
          </div>
          {/* Category badge */}
          <span
            className="badge border text-xs px-2.5 py-1 self-start"
            style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
          >
            {cat.label}
          </span>
        </div>

        {/* Status timeline */}
        <div className="glass p-5 animate-slide-up">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-5">Progress</p>
          <div className="flex items-start">
            {STATUS_STEPS.map((step, i) => {
              const done = step.doneIf.includes(ticket.status)
              const active = step.key === ticket.status ||
                (step.key === 'triage' && ticket.status === 'pending') ||
                (step.key === 'submitted' && ticket.status === 'pending')
              const StepIcon = step.icon
              const nodeColor = done ? '#10b981' : active ? '#6366f1' : undefined

              return (
                <div key={step.key} className="flex items-start flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0"
                      style={{
                        borderColor: nodeColor || 'rgba(255,255,255,0.1)',
                        background: done ? nodeColor : active ? 'rgba(99,102,241,0.15)' : 'transparent',
                        boxShadow: active ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
                      }}
                    >
                      {done
                        ? <CheckCircle2 size={14} className="text-white" />
                        : <StepIcon size={13} style={{ color: active ? '#818cf8' : '#334155' }} />
                      }
                    </div>
                    <span
                      className="text-[10px] font-medium text-center leading-tight"
                      style={{ color: done ? '#10b981' : active ? '#818cf8' : '#475569', maxWidth: '56px' }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mt-4 mx-1 rounded-full transition-all duration-500"
                      style={{ background: done ? '#10b981' : 'rgba(255,255,255,0.06)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Crew assignment — uses real assigned_crew from backend */}
        {crew ? (
          <div
            className="glass p-5 flex flex-col gap-3 animate-slide-up"
            style={{ border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Crew Assigned</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Team</p>
                <p className="text-sm font-semibold text-slate-100">{crew.label}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Specialty</p>
                <p className="text-sm text-slate-300">{crew.specialty}</p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="glass p-5 flex items-center gap-3 animate-slide-up"
            style={{ border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <Clock size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-slate-400">
              Your report is in the AI triage queue. A crew will be assigned shortly.
            </p>
          </div>
        )}

        {/* Escalation banner */}
        {ticket.escalated && (
          <div
            className="glass p-4 flex items-start gap-3 animate-slide-up"
            style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}
          >
            <span className="text-amber-400 font-bold text-sm shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Escalated{ticket.escalation_level ? ` to ${ticket.escalation_level.replace('_', ' ')}` : ''}
              </p>
              {ticket.escalation_note && (
                <p className="text-xs text-slate-400 mt-1">{ticket.escalation_note}</p>
              )}
            </div>
          </div>
        )}

        {/* Photo gallery — shown only if ticket has photos */}
        {photos.length > 0 && (
          <PhotoGallery photos={photos} />
        )}

        {/* AI triage summary */}
        <div
          className="glass p-5 flex flex-col gap-4 animate-slide-up"
          style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">AI Triage Summary</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Category</p>
              <span
                className="badge border text-xs px-2.5 py-1"
                style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
              >
                {cat.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Priority</p>
              <span
                className="badge border text-xs px-2.5 py-1"
                style={{ color: priority.color, background: priority.bg, borderColor: priority.color + '40' }}
              >
                {priority.label}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{reasoning}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link to="/requests" className="btn-secondary flex-1 py-2.5 text-center text-sm">
            View All Reports
          </Link>
          <Link to="/report" className="btn-primary flex-1 py-2.5 text-center text-sm">
            Submit Another Report
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────

export default function TrackIssuePage() {
  const { id } = useParams()
  const { isAuthenticated } = useCitizenAuth()

  if (id) return <TicketTracker id={id} />
  if (isAuthenticated) return <MyTicketsList />
  return <TrackSearchForm />
}
