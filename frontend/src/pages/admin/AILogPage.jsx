import { useState, useEffect, useMemo, useCallback } from 'react'
import { BrainCircuit, ChevronDown, ChevronUp, Info, CheckCircle2, AlertTriangle, RefreshCw, Filter, TrendingUp, Zap } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { CATEGORY_MAP, MOCK_CREWS } from '../../utils/constants'
import { requestsApi } from '../../api/client'

// Maps assigned_crew id → human-readable team name
const crewLabel = (crewId) =>
  MOCK_CREWS.find((c) => c.id === crewId)?.label || crewId || 'Unknown Crew'

// Category-specific reasoning templates used to generate realistic mock AI entries.
// The crew and ticket info are injected dynamically from real ticket data.
const REASONING_TEMPLATES = {
  streetlight: (t) => ({
    decision: `Assigned to ${crewLabel(t.assigned_crew)}. Streetlight outage detected — priority set based on surrounding foot traffic.`,
    confidence: 0.89,
    status: 'success',
    reasoning: [
      `Category: Streetlight / Electrical → ${crewLabel(t.assigned_crew)} specialty`,
      'No prior unresolved streetlight report at this location within 14 days',
      'Foot-traffic score for location: moderate — standard SLA (48 hrs) applied',
      'Crew availability confirmed via find_nearest_crew() tool call',
    ],
  }),
  road: (t) => ({
    decision: `Escalated to Senior Engineer — pothole depth likely exceeds 8 cm safety threshold. ${crewLabel(t.assigned_crew)} standing by.`,
    confidence: 0.87,
    status: 'escalated',
    reasoning: [
      `Category: Road / Pothole → ${crewLabel(t.assigned_crew)}`,
      'Reported dimensions suggest depth > 8 cm — exceeds Auckland Transport threshold',
      'Escalation rule triggered: deep pothole on arterial road → senior engineer review',
      'Ticket priority boosted from Normal to Critical',
    ],
  }),
  footpath: (t) => ({
    decision: `Assigned to ${crewLabel(t.assigned_crew)}. Flagged as accessibility-critical.`,
    confidence: 0.94,
    status: 'success',
    reasoning: [
      `Category: Footpath → ${crewLabel(t.assigned_crew)} specialty`,
      'Description analysed for accessibility keywords — high-priority flag applied',
      'Priority boosted from Normal to High',
      'Citizen notification queued: ETA 2 business days',
    ],
  }),
  park: (t) => ({
    decision: `Assigned to ${crewLabel(t.assigned_crew)}. Playground/park safety issue — same-day inspection scheduled.`,
    confidence: 0.92,
    status: 'success',
    reasoning: [
      `Category: Park / Green Space → ${crewLabel(t.assigned_crew)}`,
      'Safety hazard detected in description — child-safety flag raised',
      'Park usage score: high — same-day inspection SLA triggered',
      'Crew dispatched with safety equipment checklist',
    ],
  }),
  graffiti: (t) => ({
    decision: `Assigned to ${crewLabel(t.assigned_crew)}. ${t.description?.toLowerCase().includes('offensive') ? 'Offensive content flag raised — priority escalated.' : 'Standard removal SLA applied.'}`,
    confidence: 0.97,
    status: 'success',
    reasoning: [
      `Category: Graffiti → ${crewLabel(t.assigned_crew)}`,
      t.description?.toLowerCase().includes('offensive')
        ? 'Offensive content detected → priority escalated to High, same-day SLA'
        : 'No offensive content detected → standard 48-hour SLA',
      'Public visibility score computed from location footfall data',
      'Removal kit and crew confirmed available',
    ],
  }),
  bus_stop: (t) => ({
    decision: `Assigned to ${crewLabel(t.assigned_crew)}. Shelter infrastructure damage — safety cordon recommended.`,
    confidence: 0.88,
    status: t.escalated ? 'escalated' : 'success',
    reasoning: [
      `Category: Bus Stop / Shelter → ${crewLabel(t.assigned_crew)}`,
      'Structural damage detected — safety advisory issued to AT HOP operations',
      'Weather exposure risk: high — expedited response',
      'Crew dispatched with temporary barriers',
    ],
  }),
  public_toilet: (t) => ({
    decision: `Assigned to ${crewLabel(t.assigned_crew)}. Public health priority applied.`,
    confidence: 0.85,
    status: 'success',
    reasoning: [
      `Category: Public Toilet → ${crewLabel(t.assigned_crew)}`,
      'Public health risk classification: moderate',
      'Facility usage hours indicate peak-time impact — priority elevated',
      'Maintenance crew and hygiene supplies confirmed',
    ],
  }),
  other: (t) => ({
    decision: `Assigned to ${crewLabel(t.assigned_crew)} for general assessment.`,
    confidence: 0.62,
    status: 'success',
    reasoning: [
      `Category: Other / Unclassified → ${crewLabel(t.assigned_crew)} (general maintenance)`,
      'No specialist crew match — default assignment applied',
      'Confidence below 0.75 — human dispatcher notified for review',
      'Ticket flagged for manual crew re-assignment if needed',
    ],
  }),
}

function generateAIEntry(ticket, index) {
  const template = REASONING_TEMPLATES[ticket.category] || REASONING_TEMPLATES.other
  const aiData = template(ticket)
  return {
    id:        `ai-${String(ticket.id).padStart(3, '0')}`,
    ticketId:  ticket.id,
    timestamp: ticket.created_at
      ? new Date(new Date(ticket.created_at).getTime() + (index + 1) * 15 * 60 * 1000).toISOString()
      : new Date().toISOString(),
    category: ticket.category,
    ...aiData,
  }
}

const AI_STATUS = {
  success:   { label: 'Success',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.4)',  Icon: CheckCircle2 },
  escalated: { label: 'Escalated', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)',  Icon: AlertTriangle },
}

function formatDateTime(dateStr) {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

function AILogEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const aiStyle = AI_STATUS[entry.status] || AI_STATUS.escalated
  const { Icon: AiIcon } = aiStyle
  const cat = CATEGORY_MAP[entry.category] || { label: entry.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', icon: 'HelpCircle' }
  const CatIcon = LucideIcons[cat.icon] || LucideIcons.HelpCircle
  const confidencePct = Math.round(entry.confidence * 100)

  return (
    <div className="glass p-5 flex flex-col gap-4 animate-slide-up">
      {/* Entry header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-indigo-400">
            Ticket #{entry.ticketId}
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500">{formatDateTime(entry.timestamp)}</span>
        </div>
        <span
          className="badge border text-xs shrink-0 inline-flex items-center gap-1"
          style={{ color: aiStyle.color, background: aiStyle.bg, borderColor: aiStyle.border }}
        >
          <AiIcon size={11} />
          {aiStyle.label}
        </span>
      </div>

      {/* Decision text */}
      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
        {entry.decision}
      </p>

      {/* Confidence bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Confidence</span>
          <span style={{ color: aiStyle.color }} className="font-semibold">{confidencePct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${confidencePct}%`,
              background: confidencePct >= 80
                ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                : confidencePct >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                  : 'linear-gradient(90deg, #ef4444, #f59e0b)',
            }}
          />
        </div>
      </div>

      {/* Collapsible reasoning steps */}
      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="btn-ghost flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 -ml-2"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide' : 'Show'} reasoning ({entry.reasoning.length} steps)
        </button>

        {expanded && (
          <ul className="mt-2 flex flex-col gap-2 animate-slide-down">
            {entry.reasoning.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: aiStyle.color }}
                />
                {step}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: model tag + category */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--divider)' }}>
        <span className="text-xs text-slate-600 font-mono">gpt-4o</span>
        <span
          className="badge border text-xs inline-flex items-center gap-1"
          style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
        >
          <CatIcon size={10} />
          {cat.label}
        </span>
      </div>
    </div>
  )
}

export default function AILogPage() {
  const [aiLog, setAiLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [usedMock, setUsedMock] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch real tickets, take the most-recent 8, and generate AI entries from them.
  // If the API is unreachable, fall back to the 5 hardcoded mock entries.
  const loadLog = useCallback(async () => {
    setLoading(true)
    try {
      const res = await requestsApi.list({ page_size: 8 })
      const tickets = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setAiLog(tickets.map((t, i) => generateAIEntry(t, i)))
      setUsedMock(false)
    } catch {
      // Fallback: generate from category-representative mock tickets
      const MOCK_FALLBACK = [
        { id: 6, category: 'bus_stop',   assigned_crew: 'crew-echo',    description: 'Roof collapsed', created_at: '2025-03-06T07:30:00Z', escalated: false },
        { id: 2, category: 'road',       assigned_crew: 'crew-alpha',   description: 'Deep pothole causing tyre damage', created_at: '2025-03-03T14:30:00Z', escalated: false },
        { id: 4, category: 'footpath',   assigned_crew: 'crew-alpha',   description: 'Cracked footpath with wheelchair mention', created_at: '2025-03-05T11:45:00Z', escalated: false },
        { id: 5, category: 'graffiti',   assigned_crew: 'crew-delta',   description: 'Offensive graffiti on toilet block', created_at: '2025-02-25T16:20:00Z', escalated: false },
        { id: 1, category: 'streetlight', assigned_crew: 'crew-bravo',  description: 'Streetlight out for two weeks', created_at: '2025-03-01T09:12:00Z', escalated: false },
      ]
      setAiLog(MOCK_FALLBACK.map((t, i) => generateAIEntry(t, i)))
      setUsedMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLog() }, [loadLog])

  const handleRefresh = () => {
    setRefreshing(true)
    loadLog().finally(() => setRefreshing(false))
  }

  // Derive available categories from the current log
  const categories = useMemo(() => {
    const seen = new Set(aiLog.map((e) => e.category))
    return ['all', ...seen]
  }, [aiLog])

  const filtered = useMemo(() => aiLog.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    return true
  }), [aiLog, statusFilter, categoryFilter])

  // Summary stats
  const total      = aiLog.length
  const successes  = aiLog.filter((e) => e.status === 'success').length
  const avgConf    = total ? Math.round(aiLog.reduce((s, e) => s + e.confidence, 0) / total * 100) : 0
  const successRate = total ? Math.round((successes / total) * 100) : 0

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            AI Reasoning Log
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Decisions made by the agentic AI for each incoming ticket
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="btn-secondary flex items-center gap-2 text-xs px-3 py-2 shrink-0"
        >
          <RefreshCw size={12} className={(loading || refreshing) ? 'animate-spin' : ''} />
          {(loading || refreshing) ? 'Syncing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Decisions', value: loading ? '…' : total, icon: BrainCircuit, color: '#6366f1' },
          { label: 'Success Rate',    value: loading ? '…' : `${successRate}%`, icon: TrendingUp, color: '#10b981' },
          { label: 'Avg Confidence',  value: loading ? '…' : `${avgConf}%`, icon: Zap, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="glass p-4 flex flex-col gap-2"
            style={{ border: `1px solid ${color}20` }}
          >
            <div className="flex items-center gap-2">
              <Icon size={13} style={{ color }} />
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
            </div>
            <span className="text-2xl font-extrabold" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={13} className="text-slate-500 shrink-0" />
        {['all', 'success', 'escalated'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? 'all' : s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 capitalize ${
              statusFilter === s
                ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            {s === 'all' ? 'All statuses' : s}
          </button>
        ))}
        <div className="w-px h-4 bg-white/10 mx-1" />
        {categories.map((c) => {
          const cat = CATEGORY_MAP[c]
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === categoryFilter ? 'all' : c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 ${
                categoryFilter === c
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                  : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              {c === 'all' ? 'All categories' : cat?.label || c}
            </button>
          )
        })}
      </div>

      {/* Info banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl text-sm"
        style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)' }}
      >
        <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-slate-300 leading-relaxed">
          <strong className="text-slate-100">Sprint 3 preview.</strong>{' '}
          {usedMock
            ? 'Backend offline — showing representative demo data. '
            : 'Showing mock AI reasoning for your most recent tickets. '}
          Live AI decisions (Sense-Plan-Act-Reflect cycle) will appear here once the FastAPI MCP
          server is connected in Sprint 3.
        </div>
      </div>

      {/* AI log entries */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass p-5">
              <div className="skeleton h-4 rounded w-1/3 mb-3" />
              <div className="skeleton h-4 rounded w-2/3 mb-3" />
              <div className="skeleton h-2 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-16 rounded-2xl text-center"
          style={{ border: '1px dashed var(--card-border)' }}
        >
          <BrainCircuit size={32} className="text-slate-600" />
          <p className="text-sm text-slate-500">No entries match the selected filters.</p>
          <button
            onClick={() => { setStatusFilter('all'); setCategoryFilter('all') }}
            className="btn-ghost text-xs text-indigo-400 hover:text-indigo-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-600">{filtered.length} of {total} entries</p>
          {filtered.map((entry) => (
            <AILogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
