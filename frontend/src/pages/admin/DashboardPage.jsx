import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Ticket, Clock, Wrench, CheckCircle2, XCircle,
  RefreshCw, BrainCircuit, ArrowRight,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { requestsApi, statsApi } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import { CATEGORY_MAP } from '../../utils/constants'
import AdminMap from '../../components/AdminMap'

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

const CREW_LABELS = {
  'crew-alpha':   'Alpha — Roads',
  'crew-bravo':   'Bravo — Electrical',
  'crew-charlie': 'Charlie — Parks',
  'crew-delta':   'Delta — Graffiti',
  'crew-echo':    'Echo — General',
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState([])
  const [adminStats, setAdminStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const navigate = useNavigate()

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        requestsApi.list({ page_size: 999 }),
        statsApi.admin(),
      ])
      const data = Array.isArray(ticketsRes.data) ? ticketsRes.data : (ticketsRes.data.results || [])
      setTickets(data)
      setAdminStats(statsRes.data)
    } catch (err) {
      setFetchError(err?.userMessage || 'Could not reach the backend. Check your connection.')
      setTickets([])
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
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Overview
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            All community reports at a glance
            {fetchError && <span className="text-rose-400 ml-2">⚠ {fetchError}</span>}
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }, idx) => (
          <div
            key={key}
            className={`glass p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 hover:scale-[1.02] transition-transform duration-200 ${idx === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
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
                  className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: bg }}
                >
                  <Icon size={14} className="sm:hidden" style={{ color }} />
                  <Icon size={20} className="hidden sm:block" style={{ color }} />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-extrabold" style={{ color }}>
                    {stats[key]}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-tight">{label}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Live Issue Map ── */}
      <div className="glass p-5 flex flex-col gap-2">
        <AdminMap
          tickets={tickets}
          loading={loading}
          onStatusChange={async (id, status) => {
            await requestsApi.updateStatus(id, status)
            fetchTickets()
          }}
        />
      </div>

      {/* Recent tickets table */}
      <div className="glass overflow-hidden">
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
                {[
                  { label: 'ID',       cls: '' },
                  { label: 'Title',    cls: '' },
                  { label: 'Category', cls: 'hidden sm:table-cell' },
                  { label: 'Status',   cls: '' },
                  { label: 'Date',     cls: 'hidden sm:table-cell' },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={`px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${cls}`}
                  >
                    {label}
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
                    <td className="px-6 py-4 text-xs text-slate-500">{t.id}</td>
                    <td className="px-6 py-4 text-sm font-medium max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>
                      {t.title}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
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
                    <td className="px-6 py-4 text-xs text-slate-500 hidden sm:table-cell">
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
          <div className="glass p-6 flex flex-col gap-5">
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

      {/* Advanced analytics */}
      {adminStats && (
        <>
          {/* SLA summary strip */}
          <div className="glass p-4 flex flex-wrap gap-4 items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>SLA Status</span>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold text-emerald-400">{adminStats.sla_stats?.on_time ?? '—'}</span> on-time
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-rose-400" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold text-rose-400">{adminStats.sla_stats?.overdue ?? '—'}</span> overdue
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-indigo-400" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold text-indigo-400">{adminStats.resolution_rate_pct ?? '—'}%</span> resolved within 72 h
                </span>
              </div>
            </div>
            {(adminStats.sla_stats?.overdue > 0) && (
              <span className="text-xs text-rose-400 font-medium">
                ⚠ {adminStats.sla_stats.overdue} ticket{adminStats.sla_stats.overdue !== 1 ? 's' : ''} past SLA
              </span>
            )}
          </div>

          {/* Crew performance table */}
          {adminStats.crew_stats?.length > 0 && (
            <div className="glass p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Crew Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                      {['Team', 'Tickets', 'Resolved', 'Avg Resolution'].map((h) => (
                        <th key={h} className="text-left pb-2 pr-4 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminStats.crew_stats.map((c) => (
                      <tr key={c.crew} style={{ borderBottom: '1px solid var(--divider)' }}>
                        <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                          {CREW_LABELS[c.crew] || c.crew}
                        </td>
                        <td className="py-2 pr-4 text-indigo-400">{c.ticket_count}</td>
                        <td className="py-2 pr-4 text-emerald-400">{c.resolved_count}</td>
                        <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>
                          {c.avg_resolution_hours != null ? `${c.avg_resolution_hours} h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 30-day trend bar chart (pure CSS) */}
          {adminStats.daily_trend?.length > 0 && (() => {
            const maxCount = Math.max(...adminStats.daily_trend.map((d) => d.count), 1)
            return (
              <div className="glass p-5 flex flex-col gap-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>30-Day Submission Trend</h3>
                <div className="flex items-end gap-0.5 h-20 overflow-x-auto">
                  {adminStats.daily_trend.map((d) => (
                    <div
                      key={d.date}
                      className="flex-shrink-0 rounded-t-sm transition-all duration-200 hover:opacity-80 cursor-default"
                      style={{
                        width: '10px',
                        height: `${Math.max(4, (d.count / maxCount) * 100)}%`,
                        background: 'rgba(99,102,241,0.7)',
                      }}
                      title={`${d.date}: ${d.count} ticket${d.count !== 1 ? 's' : ''}`}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Hover bars for daily counts · peak: {maxCount} tickets
                </p>
              </div>
            )
          })()}
        </>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
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
