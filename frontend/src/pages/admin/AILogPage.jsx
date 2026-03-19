import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BrainCircuit, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, RefreshCw, Filter, TrendingUp, Zap, X,
  AlertCircle, Sparkles, RotateCcw, Trash2,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { CATEGORY_MAP, CREW_MAP } from '../../utils/constants'
import { aiLogApi } from '../../api/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

const crewLabel = (crewId) => CREW_MAP[crewId]?.label || crewId || 'Unknown Crew'

const AI_STATUS = {
  success:   { label: 'Success',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.4)',  Icon: CheckCircle2 },
  escalated: { label: 'Escalated', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)',  Icon: AlertTriangle },
  error:     { label: 'Error',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)',   Icon: AlertCircle },
}

function formatDateTime(dateStr) {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

// ── Confirmation modal for the destructive Clear Log action ───────────────────

function ConfirmClearModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="glass p-6 rounded-2xl max-w-sm w-full flex flex-col gap-5 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <Trash2 size={16} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Clear AI Log?</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete all AI log entries. Tickets are not affected — only the GPT-4o decision records will be removed. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1 justify-center py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold transition-all duration-150"
            style={{ background: '#ef4444', color: '#fff' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {loading ? 'Clearing…' : 'Yes, Clear All'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single log entry card ─────────────────────────────────────────────────────

function AILogEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)

  const aiStyle  = AI_STATUS[entry.status] || AI_STATUS.success
  const { Icon: AiIcon } = aiStyle
  const cat      = CATEGORY_MAP[entry.category] || { label: entry.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', icon: 'HelpCircle' }
  const CatIcon  = LucideIcons[cat.icon] || LucideIcons.HelpCircle
  const confidencePct = Math.round((entry.confidence || 0) * 100)

  return (
    <div className="glass p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-indigo-400">Ticket #{entry.ticket_id}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500">{formatDateTime(entry.created_at)}</span>
        </div>
        <span
          className="badge border text-xs shrink-0 inline-flex items-center gap-1"
          style={{ color: aiStyle.color, background: aiStyle.bg, borderColor: aiStyle.border }}
        >
          <AiIcon size={11} />
          {aiStyle.label}
        </span>
      </div>

      {entry.summary && (
        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{entry.summary}</p>
      )}

      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
        {entry.decision}
      </p>

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

      {entry.reasoning?.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="btn-ghost flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 -ml-2"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : 'Show'} reasoning ({entry.reasoning.length} steps)
          </button>
          {expanded && (
            <ul className="mt-2 flex flex-col gap-2">
              {entry.reasoning.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: aiStyle.color }} />
                  {step}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2" style={{ borderTop: '1px solid var(--divider)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-mono">{entry.model || 'gpt-4o'}</span>
          {entry.assigned_crew && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-500">{crewLabel(entry.assigned_crew)}</span>
            </>
          )}
        </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AILogPage() {
  const [aiLog,          setAiLog]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [fetchError,     setFetchError]     = useState(false)
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [refreshing,     setRefreshing]     = useState(false)
  const [backfilling,    setBackfilling]    = useState(false)
  const [regenerating,   setRegenerating]   = useState(false)
  const [clearing,       setClearing]       = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)  // confirmation before clear
  const [statusMsg,      setStatusMsg]      = useState(null)   // {type, text} feedback banner

  const loadLog = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const res     = await aiLogApi.list()
      const entries = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setAiLog(entries)
    } catch {
      setAiLog([])
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLog() }, [loadLog])

  const handleRefresh = () => {
    setRefreshing(true)
    loadLog().finally(() => setRefreshing(false))
  }

  // Analyse All — only processes tickets without an existing AILog entry
  const handleBackfill = async () => {
    setBackfilling(true)
    setStatusMsg(null)
    try {
      const res    = await aiLogApi.backfill()
      const queued = res.data?.queued ?? 0
      if (queued === 0) {
        setStatusMsg({ type: 'success', text: 'All tickets are already analysed.' })
      } else {
        setStatusMsg({ type: 'success', text: `Analysing ${queued} ticket(s) — results will appear shortly.` })
        setTimeout(() => loadLog(), 8000)
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Analyse failed. Make sure OPENAI_API_KEY is set.' })
    } finally {
      setBackfilling(false)
    }
  }

  // Regenerate All — overwrites every AILog entry, including existing ones
  const handleRegenerate = async () => {
    setRegenerating(true)
    setStatusMsg(null)
    try {
      const res    = await aiLogApi.regenerate()
      const queued = res.data?.queued ?? 0
      setStatusMsg({ type: 'success', text: `Re-analysing all ${queued} ticket(s) — results will update shortly.` })
      setTimeout(() => loadLog(), 8000)
    } catch {
      setStatusMsg({ type: 'error', text: 'Regeneration failed. Make sure OPENAI_API_KEY is set.' })
    } finally {
      setRegenerating(false)
    }
  }

  // Clear Log — deletes all AILog entries after confirmation
  const handleClearConfirm = async () => {
    setClearing(true)
    setStatusMsg(null)
    try {
      const res = await aiLogApi.clear()
      setShowClearModal(false)
      setAiLog([])
      setStatusMsg({ type: 'success', text: `Cleared ${res.data?.deleted ?? 0} AI log entry(s). Tickets are untouched.` })
    } catch {
      setShowClearModal(false)
      setStatusMsg({ type: 'error', text: 'Clear failed. Only superusers can clear the log.' })
    } finally {
      setClearing(false)
    }
  }

  const categories = useMemo(() => {
    const seen = new Set(aiLog.map((e) => e.category).filter(Boolean))
    return ['all', ...seen]
  }, [aiLog])

  const filtered = useMemo(() => aiLog.filter((e) => {
    if (statusFilter   !== 'all' && e.status   !== statusFilter)   return false
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    return true
  }), [aiLog, statusFilter, categoryFilter])

  const total       = aiLog.length
  const successes   = aiLog.filter((e) => e.status === 'success').length
  const avgConf     = total ? Math.round(aiLog.reduce((s, e) => s + (e.confidence || 0), 0) / total * 100) : 0
  const successRate = total ? Math.round((successes / total) * 100) : 0

  const anyBusy = backfilling || regenerating || loading

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">

      {/* Confirmation modal */}
      {showClearModal && (
        <ConfirmClearModal
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearModal(false)}
          loading={clearing}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            AI Reasoning Log
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real GPT-4o decisions made for each incoming ticket
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Analyse All — only unanalysed tickets */}
          <button
            onClick={handleBackfill}
            disabled={anyBusy}
            className="btn-secondary flex items-center gap-2 text-xs px-3 py-2"
            title="Analyse tickets that don't have an AI decision yet"
          >
            <Sparkles size={12} className={backfilling ? 'animate-pulse' : ''} />
            {backfilling ? 'Analysing…' : 'Analyse All'}
          </button>

          {/* Regenerate All — re-runs GPT-4o on every ticket */}
          <button
            onClick={handleRegenerate}
            disabled={anyBusy}
            className="btn-secondary flex items-center gap-2 text-xs px-3 py-2"
            title="Re-run GPT-4o on all tickets, overwriting existing decisions"
          >
            <RotateCcw size={12} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerating…' : 'Regenerate All'}
          </button>

          {/* Clear Log — destructive, superuser only, requires confirmation */}
          <button
            onClick={() => setShowClearModal(true)}
            disabled={anyBusy || total === 0}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded transition-all duration-150 font-medium"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--card-border)' }}
            title="Delete all AI log entries (tickets are not affected)"
          >
            <Trash2 size={12} />
            Clear Log
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="btn-secondary flex items-center gap-2 text-xs px-3 py-2"
          >
            <RefreshCw size={12} className={(loading || refreshing) ? 'animate-spin' : ''} />
            {(loading || refreshing) ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {statusMsg && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm animate-slide-up"
          style={{
            background: statusMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color:  statusMsg.type === 'success' ? '#10b981' : '#f87171',
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {statusMsg.text}
          <button onClick={() => setStatusMsg(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Decisions', value: loading ? '…' : total,             icon: BrainCircuit, color: '#6366f1' },
          { label: 'Success Rate',    value: loading ? '…' : `${successRate}%`, icon: TrendingUp,   color: '#10b981' },
          { label: 'Avg Confidence',  value: loading ? '…' : `${avgConf}%`,     icon: Zap,          color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass p-4 flex flex-col gap-2" style={{ border: `1px solid ${color}20` }}>
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
        {['success', 'escalated', 'error'].map((s) => {
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? 'all' : s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 capitalize flex items-center gap-1.5 ${
                active ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300' : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              {s}{active && <X size={10} />}
            </button>
          )
        })}
        <div className="w-px h-4 bg-white/10 mx-1" />
        {categories.filter((c) => c !== 'all').map((c) => {
          const cat    = CATEGORY_MAP[c]
          const active = categoryFilter === c
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(active ? 'all' : c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 flex items-center gap-1.5 ${
                active ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300' : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat?.label || c}{active && <X size={10} />}
            </button>
          )
        })}
        {(statusFilter !== 'all' || categoryFilter !== 'all') && (
          <button
            onClick={() => { setStatusFilter('all'); setCategoryFilter('all') }}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-1 underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="text-slate-300">
            Could not load AI log entries. Make sure{' '}
            <code className="mx-1 text-xs bg-white/5 px-1 rounded">OPENAI_API_KEY</code>
            is set in <code className="text-xs bg-white/5 px-1 rounded">.env</code>.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && aiLog.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 rounded-2xl text-center" style={{ border: '1px dashed var(--card-border)' }}>
          <BrainCircuit size={32} className="text-slate-600" />
          <div>
            <p className="text-sm text-slate-400 font-medium">No AI decisions yet.</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
              Run GPT-4o analysis on all existing tickets to populate this log.
            </p>
          </div>
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
          >
            <Sparkles size={14} className={backfilling ? 'animate-pulse' : ''} />
            {backfilling ? 'Analysing…' : 'Analyse All Tickets'}
          </button>
        </div>
      )}

      {/* Log entries */}
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
      ) : filtered.length === 0 && aiLog.length > 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-2xl text-center" style={{ border: '1px dashed var(--card-border)' }}>
          <BrainCircuit size={32} className="text-slate-600" />
          <p className="text-sm text-slate-500">No entries match the selected filters.</p>
          <button onClick={() => { setStatusFilter('all'); setCategoryFilter('all') }} className="btn-ghost text-xs text-indigo-400 hover:text-indigo-300">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.length > 0 && <p className="text-xs text-slate-600">{filtered.length} of {total} entries</p>}
          {filtered.map((entry) => <AILogEntry key={entry.id} entry={entry} />)}
        </div>
      )}
    </div>
  )
}
