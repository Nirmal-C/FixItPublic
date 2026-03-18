import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2, Clock, Wrench, Search, MapPin, User,
  BrainCircuit, Sparkles, AlertTriangle, ArrowLeft, RefreshCw,
  Zap, Trees, Footprints, Construction, Building2, Bus, Paintbrush, HelpCircle,
} from 'lucide-react'
import { CATEGORY_MAP } from '../utils/constants'

// Mock ticket data — Sprint 3 will replace this with a real API call.
const MOCK_TICKETS = {
  '1': {
    title: 'Broken streetlight on Queen St near No. 42',
    category: 'streetlight',
    status: 'in_progress',
    location: 'Queen St, Auckland CBD, near Wellesley St',
    reporter: 'Sarah K.',
    submitted: '2025-03-01T09:12:00Z',
    crew: { name: 'Team Bravo', specialty: 'Streetlights & Electrical', eta: '2:00 PM today' },
    ai: { confidence: 91, priority: 'Medium', reasoning: 'Lighting fault detected. Scheduled for nearest available electrical crew.' },
  },
  '2': {
    title: 'Deep pothole on Ponsonby Rd causing tyre damage',
    category: 'road',
    status: 'pending',
    location: 'Ponsonby Rd, between Franklin Rd and Mackelvie St',
    reporter: null,
    submitted: '2025-03-03T14:30:00Z',
    crew: null,
    ai: { confidence: 87, priority: 'High', reasoning: 'Road damage detected. High traffic impact — expedited review queued.' },
  },
  '3': {
    title: 'Playground slide damaged at Victoria Park',
    category: 'park',
    status: 'resolved',
    location: 'Victoria Park, Victoria St West',
    reporter: 'James T.',
    submitted: '2025-02-20T08:00:00Z',
    crew: { name: 'Team Charlie', specialty: 'Parks & Green Spaces', eta: null },
    ai: { confidence: 93, priority: 'Low', reasoning: 'Park facility issue logged. Scheduled for next maintenance window.' },
  },
  '4': {
    title: 'Footpath cracked and uneven near bus stop',
    category: 'footpath',
    status: 'in_progress',
    location: 'Dominion Rd near Valley Rd bus stop, Mount Eden',
    reporter: 'Aroha W.',
    submitted: '2025-03-05T11:45:00Z',
    crew: { name: 'Team Alpha', specialty: 'Roads & Footpaths', eta: 'Tomorrow 9:00 AM' },
    ai: { confidence: 95, priority: 'Medium', reasoning: 'Accessibility impact noted — crew assigned with medium priority.' },
  },
  '5': {
    title: 'Graffiti on public toilet block',
    category: 'graffiti',
    status: 'resolved',
    location: 'Myers Park public toilets, Mayoral Dr',
    reporter: null,
    submitted: '2025-02-25T16:20:00Z',
    crew: { name: 'Team Delta', specialty: 'Graffiti Removal', eta: null },
    ai: { confidence: 98, priority: 'Low', reasoning: 'Graffiti removal queued. Crew assigned based on proximity.' },
  },
  '6': {
    title: 'Bus shelter roof collapsed — safety hazard',
    category: 'bus_stop',
    status: 'in_progress',
    location: 'Great North Rd stop, Grey Lynn, outside No. 165',
    reporter: 'Mohammed A.',
    submitted: '2025-03-06T07:30:00Z',
    crew: { name: 'Team Bravo', specialty: 'Streetlights & Electrical', eta: '4:00 PM today' },
    ai: { confidence: 89, priority: 'High', reasoning: 'Infrastructure damage identified. Public safety concern — high priority assigned.' },
  },
}

const STATUS_STEPS = [
  { key: 'submitted',   label: 'Submitted',      icon: CheckCircle2, doneIf: ['pending', 'in_progress', 'resolved', 'closed'] },
  { key: 'triage',      label: 'AI Triage',       icon: BrainCircuit, doneIf: ['pending', 'in_progress', 'resolved', 'closed'] },
  { key: 'assigned',    label: 'Crew Assigned',   icon: User,         doneIf: ['in_progress', 'resolved', 'closed'] },
  { key: 'in_progress', label: 'Work in Progress',icon: Wrench,       doneIf: ['in_progress', 'resolved', 'closed'] },
  { key: 'resolved',    label: 'Resolved',        icon: CheckCircle2, doneIf: ['resolved', 'closed'] },
]

const PRIORITY_STYLE = {
  High:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  Low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const STATUS_STYLE = {
  pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Pending Review' },
  in_progress: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'In Progress' },
  resolved:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Resolved' },
  closed:      { color: '#64748b', bg: 'rgba(100,116,139,0.12)',label: 'Closed' },
}

function formatDate(str) {
  if (!str) return '—'
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(str))
}

// Search form shown when no ID in URL
function TrackSearchForm() {
  const [id, setId] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = id.trim()
    if (trimmed) navigate(`/track/${trimmed}`)
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
          <p className="mt-2 text-slate-400">Enter your report ID to check the current status and crew assignment.</p>
        </div>

        <form onSubmit={handleSearch} className="w-full flex gap-2">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. 3 or DEMO-4821"
            className="form-input flex-1"
            autoFocus
          />
          <button type="submit" className="btn-primary px-5 py-2.5 shrink-0">
            Track
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Your report ID was shown on the submission confirmation page. Try IDs 1–6 to see demo data.
        </p>
      </div>
    </div>
  )
}

// Full tracker shown when an ID is provided
function TicketTracker({ id }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setTimeout(() => {
      const found = MOCK_TICKETS[id] || null
      setTicket(found)
      setLoading(false)
      setRefreshing(false)
    }, isRefresh ? 800 : 1000)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Unknown ticket
  if (!ticket) {
    const isDemo = id.startsWith('DEMO-')
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
              {isDemo
                ? 'Your report has been received and is currently being processed by the AI triage system. Check back shortly.'
                : 'We couldn\'t find a report with this ID. Please double-check and try again.'}
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

  const cat = CATEGORY_MAP[ticket.category] || { label: ticket.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', icon: 'HelpCircle' }
  const statusStyle = STATUS_STYLE[ticket.status] || STATUS_STYLE.pending
  const priorityStyle = PRIORITY_STYLE[ticket.ai?.priority] || PRIORITY_STYLE.Low

  return (
    <div className="section-container py-10 animate-fade-in">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Back + refresh */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/track')} className="btn-ghost flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
            <ArrowLeft size={14} /> All Reports
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
              <span className="text-xs font-semibold text-indigo-400">Report #{id}</span>
              <h1 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {ticket.title}
              </h1>
            </div>
            <span
              className="badge border text-xs px-3 py-1 shrink-0"
              style={{ color: statusStyle.color, background: statusStyle.bg, borderColor: statusStyle.color + '40' }}
            >
              {statusStyle.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {ticket.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} className="shrink-0" /> {ticket.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={11} className="shrink-0" /> Submitted {formatDate(ticket.submitted)}
            </span>
            {ticket.reporter && (
              <span className="flex items-center gap-1">
                <User size={11} className="shrink-0" /> {ticket.reporter}
              </span>
            )}
          </div>
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

        {/* Crew assignment */}
        {ticket.crew ? (
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
                <p className="text-sm font-semibold text-slate-100">{ticket.crew.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Specialty</p>
                <p className="text-sm text-slate-300">{ticket.crew.specialty}</p>
              </div>
              {ticket.crew.eta && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Estimated Arrival</p>
                  <p className="text-sm font-semibold" style={{ color: '#10b981' }}>{ticket.crew.eta}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="glass p-5 flex items-center gap-3 animate-slide-up"
            style={{ border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <Clock size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-slate-400">
              Your report is currently in the AI triage queue. A crew will be assigned shortly.
            </p>
          </div>
        )}

        {/* AI triage result */}
        {ticket.ai && (
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
                  style={{ color: priorityStyle.color, background: priorityStyle.bg, borderColor: priorityStyle.color + '40' }}
                >
                  {ticket.ai.priority}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Confidence</p>
                <span className="text-sm font-bold" style={{ color: priorityStyle.color }}>{ticket.ai.confidence}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{ticket.ai.reasoning}</p>
          </div>
        )}

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

export default function TrackIssuePage() {
  const { id } = useParams()
  return id ? <TicketTracker id={id} /> : <TrackSearchForm />
}
