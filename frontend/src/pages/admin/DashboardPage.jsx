import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Ticket, Clock, Wrench, CheckCircle2, XCircle,
  RefreshCw, BrainCircuit, ArrowRight,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { requestsApi } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import { CATEGORY_MAP } from '../../utils/constants'

// Shared mock data — same records used in ViewRequestsPage
const MOCK_ISSUES = [
  {
    id: 1, title: 'Broken streetlight on Queen St near No. 42',
    category: 'streetlight', status: 'in_progress',
    description: 'The streetlight has been out for over two weeks.',
    location_description: 'Queen St, Auckland CBD, near intersection with Wellesley St',
    reporter_name: 'Sarah K.', created_at: '2025-03-01T09:12:00Z', photo: null,
  },
  {
    id: 2, title: 'Deep pothole on Ponsonby Rd causing tyre damage',
    category: 'road', status: 'pending',
    description: 'There is a large pothole approximately 30cm wide and 10cm deep.',
    location_description: 'Ponsonby Rd, between Franklin Rd and Mackelvie St',
    reporter_name: null, created_at: '2025-03-03T14:30:00Z', photo: null,
  },
  {
    id: 3, title: 'Playground slide damaged at Victoria Park',
    category: 'park', status: 'resolved',
    description: "The main slide at the children's playground has a crack.",
    location_description: 'Victoria Park, Victoria St West, Auckland',
    reporter_name: 'James T.', created_at: '2025-02-20T08:00:00Z', photo: null,
  },
  {
    id: 4, title: 'Footpath cracked and uneven near bus stop',
    category: 'footpath', status: 'pending',
    description: 'Section of footpath has lifted due to tree roots.',
    location_description: 'Dominion Rd near Valley Rd bus stop, Mount Eden',
    reporter_name: 'Aroha W.', created_at: '2025-03-05T11:45:00Z', photo: null,
  },
  {
    id: 5, title: 'Graffiti on public toilet block',
    category: 'graffiti', status: 'resolved',
    description: 'Extensive graffiti covering the north and east walls.',
    location_description: 'Myers Park public toilets, Mayoral Dr, Auckland',
    reporter_name: null, created_at: '2025-02-25T16:20:00Z', photo: null,
  },
  {
    id: 6, title: 'Bus shelter roof collapsed — safety hazard',
    category: 'bus_stop', status: 'in_progress',
    description: "The roof of the bus shelter has partially collapsed after last week's storm.",
    location_description: 'Great North Rd stop, Grey Lynn, outside No. 165',
    reporter_name: 'Mohammed A.', created_at: '2025-03-06T07:30:00Z', photo: null,
  },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(dateStr))
}

const STAT_CARDS = [
  { key: 'total',       label: 'Total',       icon: Ticket,       color: '#0077C8', bg: 'rgba(0,119,200,0.12)' },
  { key: 'pending',     label: 'Pending',     icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { key: 'in_progress', label: 'In Progress', icon: Wrench,       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'resolved',    label: 'Resolved',    icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { key: 'closed',      label: 'Closed',      icon: XCircle,      color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
]

export default function DashboardPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [usedMock, setUsedMock] = useState(false)
  const navigate = useNavigate()

  // Load all tickets from the API. Django REST Framework can return either
  // a plain array or a paginated {results: []} object depending on config,
  // so we handle both shapes here. Falls back to mock data if the backend
  // isn't running — handy during local development.
  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await requestsApi.list({ page_size: 999 })
      const data = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setTickets(data)
      setUsedMock(false)
    } catch {
      setUsedMock(true)
      setTickets(MOCK_ISSUES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  // Count tickets per status for the stat cards.
  // We do this derivation here rather than in the render so the values
  // only recalculate when tickets changes, not on every re-render.
  const stats = {
    total:       tickets.length,
    pending:     tickets.filter(t => t.status === 'pending').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
    closed:      tickets.filter(t => t.status === 'closed').length,
  }

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Overview
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            All community reports at a glance
            {usedMock && <span className="text-amber-400 ml-2">(demo data — backend offline)</span>}
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="btn-ghost flex items-center gap-2 text-sm"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div
            key={key}
            className="glass p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-200 animate-slide-up"
          >
            {loading ? (
              <div className="flex flex-col gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton h-7 w-12 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
            ) : (
              <>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: bg }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-extrabold" style={{ color }}>
                    {stats[key]}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Recent tickets table */}
      <div className="glass overflow-hidden animate-slide-up">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent Tickets
          </h3>
          <Link
            to="/admin/tickets"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                {['#', 'Title', 'Category', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--divider)' }}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="skeleton h-4 rounded w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recentTickets.map((t) => {
                const cat = CATEGORY_MAP[t.category] || { label: t.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', icon: 'HelpCircle' }
                const CatIcon = LucideIcons[cat.icon] || LucideIcons.HelpCircle
                return (
                  <tr
                    key={t.id}
                    onClick={() => navigate('/admin/tickets')}
                    className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <td className="px-6 py-4 text-xs text-slate-500">#{t.id}</td>
                    <td className="px-6 py-4 text-sm font-medium max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>
                      {t.title}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="badge border text-xs inline-flex items-center gap-1"
                        style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
                      >
                        <CatIcon size={10} />
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDate(t.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category breakdown — pure CSS bar chart, no library needed.
          Aggregates ticket counts per category and renders proportional
          horizontal bars so the admin can spot which issue type is busiest. */}
      {!loading && tickets.length > 0 && (() => {
        const counts = Object.entries(
          tickets.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1
            return acc
          }, {})
        )
          .map(([cat, count]) => ({
            cat, count,
            ...(CATEGORY_MAP[cat] || { label: cat, color: '#0077C8', bgColor: 'rgba(0,119,200,0.1)' }),
          }))
          .sort((a, b) => b.count - a.count)
        const max = counts[0]?.count || 1

        return (
          <div className="glass p-6 flex flex-col gap-5 animate-slide-up">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Issues by Category
            </h3>
            <div className="flex flex-col gap-3">
              {counts.map(({ cat, count, label, color }) => (
                <div key={cat} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">{label || cat}</span>
                    <span className="font-semibold tabular-nums" style={{ color }}>{count}</span>
                  </div>
                  {/* Bar track — width is a proportion of the highest-count category */}
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(count / max) * 100}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 animate-slide-up">
        <Link to="/admin/tickets" className="btn-primary text-sm gap-2">
          <Ticket size={15} />
          View All Tickets
        </Link>
        <Link to="/admin/ai-log" className="btn-secondary text-sm gap-2">
          <BrainCircuit size={15} />
          AI Log
        </Link>
        <button onClick={fetchTickets} className="btn-ghost text-sm gap-2" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>
    </div>
  )
}
