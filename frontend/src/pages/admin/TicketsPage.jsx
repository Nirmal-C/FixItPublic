import { useState, useEffect, useCallback } from 'react'
import { Search, X, RefreshCw, MapPin, User, Calendar, Image, Download } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { requestsApi } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import { STATUSES, CATEGORY_MAP, MOCK_CREWS } from '../../utils/constants'

// Proxy all images through Django — never call Azure directly (private container).
// Accepts either a relative path ("tickets/2026/03/photo.jpg") or a full Azure
// URL (legacy), and returns the Django proxy URL in both cases.
function photoUrl(photo) {
  if (!photo) return null
  if (photo.startsWith('http')) {
    const match = photo.match(/maintenance-photos\/(.+?)(\?|$)/)
    return match ? `/api/photos/${match[1]}/` : null
  }
  return `/api/photos/${photo}/`
}

const MOCK_ISSUES = [
  {
    id: 1, title: 'Broken streetlight on Queen St near No. 42',
    category: 'streetlight', status: 'in_progress',
    description: 'The streetlight has been out for over two weeks. It creates a dangerous dark spot at night especially near the bus stop.',
    location_description: 'Queen St, Auckland CBD, near intersection with Wellesley St',
    reporter_name: 'Sarah K.', created_at: '2025-03-01T09:12:00Z', photo: null,
  },
  {
    id: 2, title: 'Deep pothole on Ponsonby Rd causing tyre damage',
    category: 'road', status: 'pending',
    description: 'There is a large pothole approximately 30cm wide and 10cm deep. Multiple vehicles have been damaged.',
    location_description: 'Ponsonby Rd, between Franklin Rd and Mackelvie St',
    reporter_name: null, created_at: '2025-03-03T14:30:00Z', photo: null,
  },
  {
    id: 3, title: 'Playground slide damaged at Victoria Park',
    category: 'park', status: 'resolved',
    description: "The main slide at the children's playground has a crack near the top that could cause injury to children.",
    location_description: 'Victoria Park, Victoria St West, Auckland',
    reporter_name: 'James T.', created_at: '2025-02-20T08:00:00Z', photo: null,
  },
  {
    id: 4, title: 'Footpath cracked and uneven near bus stop',
    category: 'footpath', status: 'pending',
    description: 'Section of footpath has lifted significantly due to tree roots. Accessibility is severely compromised for wheelchair users and the elderly.',
    location_description: 'Dominion Rd near Valley Rd bus stop, Mount Eden',
    reporter_name: 'Aroha W.', created_at: '2025-03-05T11:45:00Z', photo: null,
  },
  {
    id: 5, title: 'Graffiti on public toilet block',
    category: 'graffiti', status: 'resolved',
    description: 'Extensive graffiti covering the north and east walls of the toilet block. Some content is offensive.',
    location_description: 'Myers Park public toilets, Mayoral Dr, Auckland',
    reporter_name: null, created_at: '2025-02-25T16:20:00Z', photo: null,
  },
  {
    id: 6, title: 'Bus shelter roof collapsed — safety hazard',
    category: 'bus_stop', status: 'in_progress',
    description: "The roof of the bus shelter has partially collapsed after last week's storm. Sharp metal edges are exposed.",
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

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usedMock, setUsedMock] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedTicket, setSelectedTicket] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editCrew, setEditCrew] = useState('')

  const toast = useToast()

  // Fetch the full ticket list in one go (page_size=999 avoids pagination for now).
  // DRF can return a plain array or a {results:[]} envelope, so we handle both.
  // If the API is unreachable we fall back to MOCK_ISSUES and show a banner.
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

  // Client-side filtering applied on top of whatever data we have (live or mock)
  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q ||
      t.title.toLowerCase().includes(q) ||
      (t.location_description || '').toLowerCase().includes(q) ||
      String(t.id).includes(q)
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  const openPanel = (ticket) => {
    setSelectedTicket(ticket)
    setEditStatus(ticket.status)
    setEditCrew('')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setSelectedTicket(null)
  }

  const handleSave = async () => {
    if (!selectedTicket) return
    setSaving(true)
    const update = { ...selectedTicket, status: editStatus }
    try {
      await requestsApi.updateStatus(selectedTicket.id, editStatus)
      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? update : t))
      setSelectedTicket(update)
      toast.success(`Status → ${editStatus}`, { title: `Ticket #${selectedTicket.id} updated` })
    } catch {
      // Backend offline — update in-memory only so the admin can still work
      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? update : t))
      setSelectedTicket(update)
      toast.warning('Saved locally (backend offline)', { title: `Ticket #${selectedTicket.id}` })
    } finally {
      setSaving(false)
    }
  }

  // Export all currently-filtered tickets as a CSV file.
  // We build the CSV string manually (no library needed) so there are no extra dependencies.
  // Each field is wrapped in double quotes and internal quotes are escaped — this handles
  // descriptions that contain commas without breaking the column layout.
  const exportToCsv = () => {
    const headers = ['ID', 'Title', 'Category', 'Status', 'Location', 'Reporter', 'Created At']
    const rows = filtered.map((t) => [
      t.id,
      t.title,
      CATEGORY_MAP[t.category]?.label || t.category,
      t.status,
      t.location_description || '',
      t.reporter_name || 'Anonymous',
      t.created_at ? new Date(t.created_at).toLocaleDateString('en-NZ') : '',
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}`).join(','))
      .join('\n')

    // Create a temporary anchor element and click it to trigger the browser's
    // native file download — no server round-trip needed.
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `fixitpublic-tickets-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} ticket${filtered.length !== 1 ? 's' : ''} to CSV`)
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="form-input pl-9 text-sm py-2"
            />
            {search && (
              <button onClick={() => setSearch('')} className="btn-ghost absolute right-2 top-1/2 -translate-y-1/2 p-1">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[{ id: 'all', label: 'All' }, ...STATUSES].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`filter-pill text-xs ${statusFilter === s.id ? 'active' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Export button — downloads the currently-filtered set as a CSV file */}
          <button
            onClick={exportToCsv}
            className="btn-secondary flex items-center gap-1.5 text-sm"
            disabled={loading || filtered.length === 0}
            title="Download visible tickets as CSV"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={fetchTickets}
            className="btn-ghost flex items-center gap-1.5 text-sm"
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Ticket count + mock banner */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>Showing {filtered.length} of {tickets.length} tickets</span>
        {usedMock && <span className="text-amber-400">(demo data — backend offline)</span>}
      </div>

      {/* Table + panel layout */}
      <div className="flex gap-4 items-start">

        {/* Table */}
        <div className="flex-1 glass overflow-hidden min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  {['#', 'Title', 'Category', 'Status', 'Location', 'Reporter', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--divider)' }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="skeleton h-4 rounded w-full max-w-[100px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12">
                      <EmptyState
                        title="No tickets found"
                        description="Try clearing the search or filter."
                      />
                    </td>
                  </tr>
                ) : filtered.map((t) => {
                  const cat = CATEGORY_MAP[t.category] || { label: t.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', icon: 'HelpCircle' }
                  const CatIcon = LucideIcons[cat.icon] || LucideIcons.HelpCircle
                  const isSelected = selectedTicket?.id === t.id

                  return (
                    <tr
                      key={t.id}
                      onClick={() => openPanel(t)}
                      className="cursor-pointer transition-colors duration-150"
                      style={{
                        borderBottom: '1px solid var(--divider)',
                        background: isSelected ? 'rgba(99,102,241,0.08)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '' }}
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">#{t.id}</td>
                      <td className="px-4 py-3 text-sm font-medium max-w-[180px] truncate" style={{ color: 'var(--text-primary)' }}>
                        {t.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="badge border text-xs inline-flex items-center gap-1"
                          style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
                        >
                          <CatIcon size={10} />
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-[130px] truncate">
                        {t.location_description || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {t.reporter_name || <span className="italic">Anonymous</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(t.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {panelOpen && selectedTicket && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={closePanel}
            />
            <div
              className={`
                fixed right-0 top-0 h-full z-50 overflow-y-auto
                md:relative md:right-auto md:top-auto md:h-auto md:z-auto
                glass w-80 md:w-96 shrink-0 flex flex-col animate-slide-up
              `}
              style={{ maxHeight: '100vh' }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--divider)' }}
              >
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Ticket #{selectedTicket.id}
                </h3>
                <button onClick={closePanel} className="btn-ghost p-1.5">
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <h4 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {selectedTicket.title}
                </h4>

                {/* Status + category badges */}
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedTicket.status} size="sm" />
                  {(() => {
                    const cat = CATEGORY_MAP[selectedTicket.category] || { label: selectedTicket.category, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', icon: 'HelpCircle' }
                    const CatIcon = LucideIcons[cat.icon] || LucideIcons.HelpCircle
                    return (
                      <span
                        className="badge border text-xs inline-flex items-center gap-1"
                        style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
                      >
                        <CatIcon size={10} />
                        {cat.label}
                      </span>
                    )
                  })()}
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-2">
                  {selectedTicket.location_description && (
                    <div className="flex items-start gap-2 text-xs text-slate-400">
                      <MapPin size={13} className="shrink-0 mt-0.5 text-slate-500" />
                      {selectedTicket.location_description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <User size={13} className="shrink-0 text-slate-500" />
                    {selectedTicket.reporter_name || <span className="italic">Anonymous</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar size={13} className="shrink-0 text-slate-500" />
                    {formatDate(selectedTicket.created_at)}
                  </div>
                </div>

                {/* Photo — proxied through Django so the private Azure container is never
                    called directly from the browser. photoUrl() converts the stored relative
                    path into /api/photos/<path>/ which Django fetches with a fresh SAS token. */}
                {selectedTicket.photo ? (
                  <img
                    src={photoUrl(selectedTicket.photo)}
                    alt="Report photo"
                    className="w-full rounded-xl object-cover max-h-40"
                  />
                ) : (
                  <div
                    className="w-full h-24 rounded-xl flex items-center justify-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--card-border)' }}
                  >
                    <Image size={16} className="text-slate-600" />
                    <span className="text-xs text-slate-600">No photo attached</span>
                  </div>
                )}

                {/* Status timeline — visualises the ticket lifecycle as a horizontal
                    progress track so the admin can see at a glance how far along
                    a ticket is without needing to read the status badge. */}
                {(() => {
                  // Each step in the ticket lifecycle in chronological order.
                  // A step is "done" once the ticket has passed through (or is at) that stage.
                  const STEPS = [
                    { key: 'reported',    label: 'Reported',    doneIf: ['pending', 'in_progress', 'resolved', 'closed'] },
                    { key: 'assigned',    label: 'Assigned',    doneIf: ['in_progress', 'resolved', 'closed'] },
                    { key: 'in_progress', label: 'In Progress', doneIf: ['in_progress', 'resolved', 'closed'] },
                    { key: 'resolved',    label: 'Resolved',    doneIf: ['resolved', 'closed'] },
                  ]
                  return (
                    <div className="pt-1">
                      <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Progress</p>
                      <div className="flex items-center">
                        {STEPS.map((step, i) => {
                          const done = step.doneIf.includes(selectedTicket.status)
                          const active = step.key === selectedTicket.status || (step.key === 'reported' && selectedTicket.status === 'pending')
                          const color = done ? '#10b981' : active ? '#0077C8' : undefined
                          return (
                            <div key={step.key} className="flex items-center flex-1 last:flex-none">
                              <div className="flex flex-col items-center gap-1">
                                {/* Circle node */}
                                <div
                                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                                  style={{
                                    borderColor: color || 'rgba(255,255,255,0.15)',
                                    background: done ? color : 'transparent',
                                  }}
                                >
                                  {done && (
                                    <svg width="9" height="9" viewBox="0 0 10 8" fill="none">
                                      <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                {/* Step label */}
                                <span
                                  className="text-[10px] font-medium text-center whitespace-nowrap"
                                  style={{ color: color || '#475569' }}
                                >
                                  {step.label}
                                </span>
                              </div>
                              {/* Connector line between nodes */}
                              {i < STEPS.length - 1 && (
                                <div
                                  className="flex-1 h-0.5 mx-1 mb-3 rounded-full transition-all duration-300"
                                  style={{ background: done ? '#10b981' : 'rgba(255,255,255,0.08)' }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '1rem' }} className="flex flex-col gap-4">
                  {/* Update status */}
                  <div>
                    <label className="form-label">Update Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="form-input text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign crew */}
                  <div>
                    <label className="form-label">Assign Crew</label>
                    <select
                      value={editCrew}
                      onChange={(e) => setEditCrew(e.target.value)}
                      className="form-input text-sm"
                    >
                      <option value="">— Unassigned —</option>
                      {MOCK_CREWS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label} ({c.specialty})</option>
                      ))}
                    </select>
                    <p className="form-hint mt-1">Crew assignment is stored locally — Sprint 3 will persist this to the backend.</p>
                  </div>
                </div>
              </div>

              {/* Panel footer */}
              <div
                className="px-5 py-4 shrink-0"
                style={{ borderTop: '1px solid var(--divider)' }}
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary w-full justify-center gap-2"
                >
                  {saving ? <><LoadingSpinner size="sm" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}