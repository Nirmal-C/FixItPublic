import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, SlidersHorizontal, X, RefreshCw,
  AlertTriangle, MapPin, List, LayoutGrid, Map, ChevronRight, SearchX,
} from 'lucide-react'
import { CATEGORIES, STATUSES, PAGE_SIZE, CATEGORY_MAP } from '../utils/constants'
import { requestsApi } from '../api/client'
import IssueCard from '../components/IssueCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'

const STATUS_COLORS = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981', closed: '#64748b' }

/* ─── Leaflet map component ─── */
function IssueMap({ issues }) {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)

  useEffect(() => {
    import('leaflet').then((L) => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'; link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if (!mapRef.current) return
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null }

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
        .setView([-36.8607, 174.7628], 13)
      leafletRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      issues.forEach((issue) => {
        if (!issue.lat || !issue.lng) return
        const color = STATUS_COLORS[issue.status] || '#0077C8'
        const cat   = CATEGORY_MAP[issue.category] || { label: issue.category }
        L.circleMarker([issue.lat, issue.lng], { radius: 9, fillColor: color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.85 })
          .addTo(map)
          .bindPopup(`<div style="min-width:180px;font-family:system-ui,sans-serif">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">#${issue.id} ${issue.title}</p>
            <p style="font-size:11px;color:#64748b;margin:0 0 2px">${cat.label}</p>
            <p style="font-size:11px;color:${color};font-weight:600;margin:0 0 4px;text-transform:capitalize">${issue.status.replace('_', ' ')}</p>
            <p style="font-size:11px;color:#94a3b8;margin:0">${issue.location_description || ''}</p>
          </div>`)
      })
    })
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null } }
  }, [issues])

  return <div ref={mapRef} className="w-full rounded-lg overflow-hidden" style={{ height: '520px', border: '1px solid var(--card-border)' }} />
}

const ALL_STATUS = { id: 'all', label: 'All Status' }

export default function ViewRequestsPage() {
  const [issues,       setIssues]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [catFilter,    setCatFilter]    = useState('all')
  const [showFilters,  setShowFilters]  = useState(false)
  const [viewMode,     setViewMode]     = useState('list')
  const [page,         setPage]         = useState(1)
  const [totalCount,   setTotalCount]   = useState(0)

  const fetchIssues = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (statusFilter !== 'all') params.status = statusFilter
      if (catFilter    !== 'all') params.category = catFilter
      if (search.trim()) params.search = search.trim()
      const res  = await requestsApi.list(params)
      const data = res.data
      const isArr  = Array.isArray(data)
      const isPag  = data && typeof data === 'object' && Array.isArray(data.results)
      if (!isArr && !isPag) throw new Error('Unexpected response shape from API')
      if (isArr)  { setIssues(data);         setTotalCount(data.length) }
      else        { setIssues(data.results); setTotalCount(data.count || data.results.length) }
    } catch (err) {
      setError(err?.userMessage || 'Could not load reports. Please try again.')
      setIssues([])
      setTotalCount(0)
    } finally { setLoading(false) }
  }, [page, statusFilter, catFilter, search])

  useEffect(() => { fetchIssues() }, [fetchIssues])
  useEffect(() => { setPage(1) },   [statusFilter, catFilter, search])

  const totalPages   = Math.ceil(totalCount / PAGE_SIZE)
  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (catFilter !== 'all' ? 1 : 0)

  const clearFilters = () => { setStatusFilter('all'); setCatFilter('all'); setSearch('') }

  /* ── Sidebar filter button ── */
  const SidebarBtn = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-left transition-all duration-150"
      style={{
        background: active ? 'var(--accent-light)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )

  return (
    <div>

      {/* ── Page header band ── */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--divider)' }}>
        <div className="section-container py-7">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            <Link to="/" style={{ color: 'var(--text-muted)' }} onMouseEnter={(e) => e.currentTarget.style.color='var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color='var(--text-muted)'}>Home</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>Community Reports</span>
          </nav>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Community Reports</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Public facility issues submitted by residents across New Zealand
              </p>
            </div>
            <Link to="/report" className="btn-primary text-sm shrink-0 hidden sm:flex">
              + Report Issue
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main layout: sidebar + content ── */}
      <div className="section-container py-8">
        <div className="flex gap-7 items-start">

          {/* ═══════════════════════════════════
              SIDEBAR — always visible on desktop
          ═══════════════════════════════════ */}
          <aside className="hidden lg:block w-60 shrink-0 sticky top-24">
            <div className="glass flex flex-col gap-0 overflow-hidden">
              {/* Sidebar header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--divider)' }}
              >
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  Filters
                </span>
                {activeFilters > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: '#ef4444' }}
                  >
                    <X size={11} /> Clear
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="p-3" style={{ borderBottom: '1px solid var(--divider)' }}>
                <p className="form-label mb-1.5 text-xs">Search</p>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Title, location…"
                    className="form-input pl-8 text-xs py-2"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Status filter */}
              <div className="p-3" style={{ borderBottom: '1px solid var(--divider)' }}>
                <p className="form-label mb-1.5 text-xs">Status</p>
                <div className="flex flex-col gap-0.5">
                  <SidebarBtn active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                    All Status
                  </SidebarBtn>
                  {STATUSES.map((s) => (
                    <SidebarBtn key={s.id} active={statusFilter === s.id} onClick={() => setStatusFilter(s.id)}>
                      <StatusBadge status={s.id} size="sm" />
                    </SidebarBtn>
                  ))}
                </div>
              </div>

              {/* Category filter */}
              <div className="p-3">
                <p className="form-label mb-1.5 text-xs">Category</p>
                <div className="flex flex-col gap-0.5">
                  <SidebarBtn active={catFilter === 'all'} onClick={() => setCatFilter('all')}>
                    All Categories
                  </SidebarBtn>
                  {CATEGORIES.map((cat) => (
                    <SidebarBtn key={cat.id} active={catFilter === cat.id} onClick={() => setCatFilter(cat.id)}>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: cat.color }}
                      />
                      {cat.label}
                    </SidebarBtn>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ═══════════════════════════════════
              MAIN CONTENT
          ═══════════════════════════════════ */}
          <div className="flex-1 min-w-0">

            {/* Toolbar */}
            <div
              className="flex items-center justify-between mb-5 pb-4"
              style={{ borderBottom: '1px solid var(--divider)' }}
            >
              <div className="flex items-center gap-3">
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className="lg:hidden btn-secondary text-sm gap-1.5 px-3 py-2"
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {activeFilters > 0 && (
                    <span
                      className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      {activeFilters}
                    </span>
                  )}
                </button>

                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {loading
                    ? 'Loading…'
                    : <><strong style={{ color: 'var(--text-primary)' }}>{totalCount.toLocaleString()}</strong> {totalCount !== 1 ? 'reports' : 'report'}</>
                  }
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="glass-sm flex overflow-hidden">
                  {[
                    { mode: 'list', Icon: List,       label: 'List view' },
                    { mode: 'grid', Icon: LayoutGrid, label: 'Grid view' },
                    { mode: 'map',  Icon: Map,        label: 'Map view'  },
                  ].map(({ mode, Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      title={label}
                      className="px-3 py-2 transition-colors text-sm"
                      style={viewMode === mode
                        ? { color: 'var(--accent)', background: 'var(--accent-light)' }
                        : { color: 'var(--text-muted)' }
                      }
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>

                <button onClick={fetchIssues} className="btn-ghost px-2.5 py-2" title="Refresh">
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Mobile filter panel */}
            {showFilters && (
              <div className="glass p-4 mb-5 animate-slide-down lg:hidden">
                {/* Mobile search */}
                <div className="mb-3">
                  <p className="form-label">Search</p>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Title, location…"
                      className="form-input pl-9"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="form-label mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {[ALL_STATUS, ...STATUSES].map((s) => (
                        <button key={s.id} onClick={() => setStatusFilter(s.id)} className={`filter-pill ${statusFilter === s.id ? 'active' : ''}`}>
                          {s.id !== 'all' ? <StatusBadge status={s.id} size="sm" /> : s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="form-label mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setCatFilter('all')} className={`filter-pill ${catFilter === 'all' ? 'active' : ''}`}>All</button>
                      {CATEGORIES.map((cat) => (
                        <button key={cat.id} onClick={() => setCatFilter(cat.id)} className={`filter-pill ${catFilter === cat.id ? 'active' : ''}`}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {activeFilters > 0 && (
                  <button onClick={clearFilters} className="btn-ghost text-xs mt-3 gap-1" style={{ color: '#ef4444' }}>
                    <X size={12} /> Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Active filter chips (desktop, when sidebar hidden on scroll) */}
            {activeFilters > 0 && (
              <div className="hidden lg:flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active:</span>
                {statusFilter !== 'all' && (
                  <button onClick={() => setStatusFilter('all')} className="filter-pill active text-xs gap-1">
                    {STATUSES.find(s => s.id === statusFilter)?.label} <X size={10} />
                  </button>
                )}
                {catFilter !== 'all' && (
                  <button onClick={() => setCatFilter('all')} className="filter-pill active text-xs gap-1">
                    {CATEGORIES.find(c => c.id === catFilter)?.label} <X size={10} />
                  </button>
                )}
              </div>
            )}

            {/* ── Content area ── */}
            {viewMode === 'map' && !loading ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <span key={status} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                    </span>
                  ))}
                  <span className="ml-auto">Click a pin to see details</span>
                </div>
                <IssueMap issues={issues} />
              </div>

            ) : loading ? (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>

            ) : error ? (
              <div className="glass flex flex-col items-center gap-4 py-16 text-center" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                <AlertTriangle size={36} className="text-rose-400" />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Failed to load reports</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                </div>
                <button onClick={fetchIssues} className="btn-secondary text-sm gap-2">
                  <RefreshCw size={14} /> Try Again
                </button>
              </div>

            ) : issues.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No reports found"
                description={search || activeFilters > 0
                  ? 'Try adjusting your search or clearing filters.'
                  : 'Be the first to report a public facility issue in your area.'}
                action={search || activeFilters > 0 ? null : { to: '/report', label: '+ Report an Issue' }}
              />

            ) : (
              <>
                <div className={`grid gap-3 overflow-x-clip ${viewMode === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {issues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} compact={viewMode === 'list'} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 mt-8 pt-6" style={{ borderTop: '1px solid var(--divider)' }}>
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const p = i + 1
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className="w-9 h-9 rounded text-sm font-medium transition-all"
                            style={page === p
                              ? { background: 'var(--accent)', color: '#fff' }
                              : { color: 'var(--text-muted)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }
                            }
                          >
                            {p}
                          </button>
                        )
                      })}
                      {totalPages > 7 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>…</span>}
                    </div>

                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
