import { useState } from 'react'
import { BrainCircuit, ChevronDown, ChevronUp, Info, CheckCircle2, AlertTriangle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { CATEGORY_MAP } from '../../utils/constants'

// Mock AI reasoning log — represents what the Sprint 3 agentic system will produce.
// Each entry is a decision the LLM made after analysing the ticket + asset history.
const MOCK_AI_LOG = [
  {
    id: 'ai-001',
    ticketId: 6,
    timestamp: '2025-03-06T08:15:00Z',
    decision: 'Assigned to Team Bravo based on 3 prior streetlight reports at this location within 30 days.',
    confidence: 0.91,
    status: 'success',
    category: 'bus_stop',
    reasoning: [
      'Location cluster detected: Great North Rd, Grey Lynn',
      'Category: Bus Stop / Electrical → Team Bravo specialty match',
      'Historical data: Team Bravo resolved 3 of 4 similar tickets at this location',
      'Crew availability confirmed via find_nearest_crew() tool call',
    ],
  },
  {
    id: 'ai-002',
    ticketId: 2,
    timestamp: '2025-03-03T15:00:00Z',
    decision: 'Escalated to senior engineer — pothole depth exceeds 8 cm safety threshold.',
    confidence: 0.87,
    status: 'escalated',
    category: 'road',
    reasoning: [
      'Reported depth: ~10 cm, exceeds the 8 cm threshold per Auckland Transport guidelines',
      'Location: high-traffic arterial road (Ponsonby Rd)',
      'Escalation rule triggered: depth > 8 cm on arterial roads → senior engineer review',
      'Ticket priority boosted from Normal to Critical',
    ],
  },
  {
    id: 'ai-003',
    ticketId: 4,
    timestamp: '2025-03-05T12:30:00Z',
    decision: 'Assigned to Team Alpha. Flagged as accessibility-critical due to wheelchair mention.',
    confidence: 0.95,
    status: 'success',
    category: 'footpath',
    reasoning: [
      'NLP detected "wheelchair users" and "elderly" in description — accessibility-critical flag applied',
      'Category: Footpath → Team Alpha specialty',
      'Priority boosted from Normal to High',
      'Citizen notification queued: "Team Alpha assigned, ETA 2 business days"',
    ],
  },
  {
    id: 'ai-004',
    ticketId: 5,
    timestamp: '2025-02-25T17:00:00Z',
    decision: 'Assigned to Team Delta (Graffiti Removal). Offensive content flag raised — priority escalated.',
    confidence: 0.98,
    status: 'success',
    category: 'graffiti',
    reasoning: [
      'Category: Graffiti → Team Delta',
      'Description mentions offensive content → priority escalated to High',
      'Public visibility score: 8/10 (Myers Park is a high-footfall area)',
      'Same-day response SLA triggered',
    ],
  },
  {
    id: 'ai-005',
    ticketId: 1,
    timestamp: '2025-03-01T10:00:00Z',
    decision: 'Low confidence — multiple crews available with equal suitability. Deferred to human dispatcher.',
    confidence: 0.42,
    status: 'escalated',
    category: 'streetlight',
    reasoning: [
      'Three crews with Electrical skills available in radius',
      'No historical cluster data for this specific location',
      'Confidence fell below the 0.5 threshold — safe to defer rather than guess',
      'Human dispatcher notified via dashboard alert',
    ],
  },
]

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

// Each log entry manages its own expanded/collapsed state
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
        {/* AI decision status badge */}
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
        <span className="text-xs text-slate-600 font-mono">claude-opus-4-6</span>
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
  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-3xl">

      {/* Page header */}
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          AI Reasoning Log
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Decisions made by the agentic AI for each incoming ticket
        </p>
      </div>

      {/* Info banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl text-sm"
        style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)' }}
      >
        <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-slate-300 leading-relaxed">
          <strong className="text-slate-100">Sprint 3 preview.</strong> This log illustrates the
          Sense-Plan-Act-Reflect lifecycle — the AI uses the MCP server tools to analyse asset
          history, find the nearest crew, and assign tickets automatically. All entries below are
          demonstration data; live AI decisions will appear here once the FastAPI MCP server is
          connected in Sprint 3.
        </div>
      </div>

      {/* AI log entries */}
      <div className="flex flex-col gap-4">
        {MOCK_AI_LOG.map((entry) => (
          <AILogEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
