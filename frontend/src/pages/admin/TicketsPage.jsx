import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, RefreshCw, MapPin, User, Calendar, Image, Download, AlertTriangle, Maximize2, ChevronLeft, ChevronRight, Mail } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { requestsApi } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import BeforeAfterSlider from '../../components/BeforeAfterSlider'
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

// Compact photo slider used inside the side panel (not the full-screen modal).
function PanelPhotoSlider({ photos }) {
  const [idx, setIdx] = useState(0)
  const prev = (e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i - 1 + photos.length) % photos.length) }
  const next = (e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i + 1) % photos.length) }
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '160px' }}>
      <img src={photos[idx]} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
      {photos.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={next} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-200 ${i === idx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
            ))}
          </div>
          <span className="absolute top-1.5 right-1.5 text-[10px] text-white rounded px-1.5 py-0.5" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {idx + 1}/{photos.length}
          </span>
        </>
      )}
    </div>
  )
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
    before_photo: 'https://picsum.photos/seed/park-before-3/600/340',
    after_photo: 'https://picsum.photos/seed/park-after-3/600/340',
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
    before_photo: 'https://picsum.photos/seed/graffiti-before-5/600/340',
    after_photo: 'https://picsum.photos/seed/graffiti-after-5/600/340',
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

// Full-screen ticket detail modal with photo gallery + lightbox.
// Defined outside TicketsPage so it has a stable component reference.
function TicketModal({ ticket, onClose }) {
  const [lightboxIdx, setLightboxIdx] = useState(null)

  const photos = ['photo', 'photo2', 'photo3', 'photo4', 'photo5']
    .map((k) => photoUrl(ticket[k]))
    .filter(Boolean)

  const cat = CATEGORY_MAP[ticket.category] || {
    label: ticket.category, color: '#94a3b8',
    bgColor: 'rgba(148,163,184,0.1)', icon: 'HelpCircle',
  }
  const CatIcon = LucideIcons[cat.icon] || LucideIcons.HelpCircle

  // Keyboard navigation: Escape closes lightbox (or modal), arrows navigate photos
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (lightboxIdx !== null) setLightboxIdx(null)
        else onClose()
      }
      if (lightboxIdx !== null) {
        if (e.key === 'ArrowLeft')  setLightboxIdx((i) => (i - 1 + photos.length) % photos.length)
        if (e.key === 'ArrowRight') setLightboxIdx((i) => (i + 1) % photos.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, onClose, photos.length])

  return createPortal(
    <>
      {/* Modal backdrop */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        {/* Modal card — stop clicks propagating to backdrop */}
        <div
          className="glass w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--divider)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-slate-500 font-mono shrink-0">ID {ticket.id}</span>
              <h2 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {ticket.title}
              </h2>
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5 shrink-0 ml-3">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 flex flex-col gap-6">
            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={ticket.status} />
              <span
                className="badge border text-xs inline-flex items-center gap-1"
                style={{ color: cat.color, background: cat.bgColor, borderColor: cat.color + '40' }}
              >
                <CatIcon size={11} /> {cat.label}
              </span>
              {ticket.escalated && (
                <span
                  className="badge border text-xs inline-flex items-center gap-1"
                  style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.4)' }}
                >
                  <AlertTriangle size={11} /> Escalated
                </span>
              )}
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left: details */}
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{ticket.description}</p>
                </div>

                <div className="flex flex-col gap-2">
                  {ticket.location_description && (
                    <div className="flex items-start gap-2 text-sm text-slate-400">
                      <MapPin size={14} className="shrink-0 mt-0.5 text-slate-500" />
                      {ticket.location_description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <User size={14} className="shrink-0 text-slate-500" />
                    {ticket.reporter_name || <span className="italic">Anonymous</span>}
                  </div>
                  {ticket.reporter_email && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail size={14} className="shrink-0 text-slate-500" />
                      {ticket.reporter_email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar size={14} className="shrink-0 text-slate-500" />
                    {formatDate(ticket.created_at)}
                  </div>
                  {ticket.assigned_crew && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">Crew:</span>
                      <span className="font-medium text-indigo-400">
                        {MOCK_CREWS.find((c) => c.id === ticket.assigned_crew)?.label || ticket.assigned_crew}
                      </span>
                    </div>
                  )}
                </div>

                {ticket.escalated && ticket.escalation_note && (
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
                  >
                    <p className="text-xs font-semibold text-amber-400 mb-1">Escalation Note</p>
                    <p className="text-sm text-amber-200/80">{ticket.escalation_note}</p>
                  </div>
                )}
              </div>

              {/* Right: photo gallery */}
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Photos{photos.length > 0 ? ` (${photos.length})` : ''}
                </p>

                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxIdx(i)}
                        className="relative aspect-square rounded-xl overflow-hidden group focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.45)' }}
                        >
                          <Maximize2 size={22} className="text-white drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : ticket.before_photo && ticket.after_photo ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-slate-500">Before / After comparison</p>
                    <BeforeAfterSlider beforeSrc={ticket.before_photo} afterSrc={ticket.after_photo} />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center h-32 rounded-xl gap-2"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--card-border)' }}
                  >
                    <Image size={18} className="text-slate-600" />
                    <span className="text-sm text-slate-600">No photos attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox — renders above the modal */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 btn-ghost p-2 text-white"
            onClick={() => setLightboxIdx(null)}
          >
            <X size={22} />
          </button>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 btn-ghost p-3 text-white"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i - 1 + photos.length) % photos.length) }}
              >
                <ChevronLeft size={32} />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 btn-ghost p-3 text-white"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i + 1) % photos.length) }}
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={photos[lightboxIdx]}
            alt={`Photo ${lightboxIdx + 1} of ${photos.length}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-5 text-sm text-white/50">
              {lightboxIdx + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </>,
    document.body,
  )
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
  const [modalOpen, setModalOpen] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editCrew, setEditCrew] = useState('')
  const [editEscalated, setEditEscalated] = useState(false)
  const [editEscalationLevel, setEditEscalationLevel] = useState('')
  const [editEscalationNote, setEditEscalationNote] = useState('')

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
    setEditCrew(ticket.assigned_crew || '')
    setEditEscalated(ticket.escalated || false)
    setEditEscalationLevel(ticket.escalation_level || '')
    setEditEscalationNote(ticket.escalation_note || '')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setSelectedTicket(null)
  }

  const handleSave = async () => {
    if (!selectedTicket) return
    setSaving(true)
    const update = {
      ...selectedTicket,
      status:           editStatus,
      assigned_crew:    editCrew,
      escalated:        editEscalated,
      escalation_level: editEscalated ? editEscalationLevel : '',
      escalation_note:  editEscalated ? editEscalationNote  : '',
    }
    try {
      // Update status and crew/escalation in parallel
      await Promise.all([
        requestsApi.updateStatus(selectedTicket.id, editStatus),
        requestsApi.assign(selectedTicket.id, {
          assigned_crew:    editCrew,
          escalated:        editEscalated,
          escalation_level: editEscalated ? editEscalationLevel : '',
          escalation_note:  editEscalated ? editEscalationNote  : '',
        }),
      ])
      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? update : t))
      setSelectedTicket(update)
      toast.success(`Ticket ID ${selectedTicket.id} updated`, { title: 'Changes saved' })
    } catch {
      // Backend offline — update in-memory only so the admin can still work
      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? update : t))
      setSelectedTicket(update)
      toast.warning('Saved locally (backend offline)', { title: `Ticket ID ${selectedTicket.id}` })
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
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
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
    <div className="flex flex-col gap-4">

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
                  {[
                    { label: 'ID',       cls: '' },
                    { label: 'Title',    cls: '' },
                    { label: 'Category', cls: 'hidden sm:table-cell' },
                    { label: 'Status',   cls: '' },
                    { label: 'Location', cls: 'hidden md:table-cell' },
                    { label: 'Reporter', cls: 'hidden md:table-cell' },
                    { label: 'Date',     cls: 'hidden sm:table-cell' },
                  ].map(({ label, cls }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${cls}`}
                    >
                      {label}
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
                    <td colSpan={7} className="py-12 text-center">
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
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{t.id}</td>
                      <td className="px-4 py-3 text-sm font-medium max-w-[180px] truncate" style={{ color: 'var(--text-primary)' }}>
                        {t.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
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
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-[130px] truncate hidden md:table-cell">
                        {t.location_description || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap hidden md:table-cell">
                        {t.reporter_name || <span className="italic">Anonymous</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap hidden sm:table-cell">
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
                glass w-80 md:w-96 shrink-0 flex flex-col
              `}
              style={{ maxHeight: '100vh' }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--divider)' }}
              >
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Ticket ID {selectedTicket.id}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="btn-ghost p-1.5"
                    title="Full view"
                  >
                    <Maximize2 size={15} />
                  </button>
                  <button onClick={closePanel} className="btn-ghost p-1.5">
                    <X size={16} />
                  </button>
                </div>
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
                  {selectedTicket.assigned_crew && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Crew:</span>
                      <span className="font-medium text-indigo-400">
                        {MOCK_CREWS.find((c) => c.id === selectedTicket.assigned_crew)?.label || selectedTicket.assigned_crew}
                      </span>
                    </div>
                  )}
                  {selectedTicket.escalated && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <AlertTriangle size={12} />
                      <span>Escalated{selectedTicket.escalation_level ? ` → ${selectedTicket.escalation_level.replace('_', ' ')}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Photos — collect all 5 photo fields, show slider if multiple */}
                {(() => {
                  const panelPhotos = ['photo', 'photo2', 'photo3', 'photo4', 'photo5']
                    .map((k) => photoUrl(selectedTicket[k]))
                    .filter(Boolean)

                  if (selectedTicket.before_photo && selectedTicket.after_photo) {
                    return (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Before / After</p>
                        <BeforeAfterSlider beforeSrc={selectedTicket.before_photo} afterSrc={selectedTicket.after_photo} />
                      </div>
                    )
                  }

                  if (panelPhotos.length === 0) {
                    return (
                      <div
                        className="w-full h-24 rounded-xl flex items-center justify-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--card-border)' }}
                      >
                        <Image size={16} className="text-slate-600" />
                        <span className="text-xs text-slate-600">No photo attached</span>
                      </div>
                    )
                  }

                  return (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Photos{panelPhotos.length > 1 ? ` (${panelPhotos.length})` : ''}
                      </p>
                      <PanelPhotoSlider photos={panelPhotos} />
                    </div>
                  )
                })()}

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
                  </div>

                  {/* Escalation */}
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editEscalated}
                        onChange={(e) => {
                          setEditEscalated(e.target.checked)
                          if (!e.target.checked) {
                            setEditEscalationLevel('')
                            setEditEscalationNote('')
                          }
                        }}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                      <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: editEscalated ? '#f59e0b' : 'var(--text-secondary)' }}>
                        <AlertTriangle size={13} />
                        Escalate Ticket
                      </span>
                    </label>

                    {editEscalated && (
                      <div className="flex flex-col gap-3 pl-6">
                        <div>
                          <label className="form-label">Escalation Level</label>
                          <select
                            value={editEscalationLevel}
                            onChange={(e) => setEditEscalationLevel(e.target.value)}
                            className="form-input text-sm"
                          >
                            <option value="">— Select level —</option>
                            <option value="senior_engineer">Senior Engineer</option>
                            <option value="council_manager">Council Manager</option>
                            <option value="emergency">Emergency Services</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Escalation Note</label>
                          <textarea
                            value={editEscalationNote}
                            onChange={(e) => setEditEscalationNote(e.target.value)}
                            placeholder="Why is this being escalated?"
                            rows={3}
                            className="form-input text-sm resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Show current escalation info if ticket is already escalated */}
                    {!editEscalated && selectedTicket.escalated && (
                      <p className="text-xs text-amber-400 pl-6">Previously escalated — uncheck clears escalation data.</p>
                    )}
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

      {/* Full-screen detail modal */}
      {modalOpen && selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}