import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, SlidersHorizontal, X, RefreshCw,
  AlertTriangle, MapPin, List, LayoutGrid,
} from 'lucide-react'
import { CATEGORIES, STATUSES, PAGE_SIZE } from '../utils/constants'
import { requestsApi } from '../api/client'
import IssueCard from '../components/IssueCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'

// fallback data when the backend isn't running yet
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
    description: 'There is a large pothole approximately 30cm wide and 10cm deep. Multiple vehicles have been damaged. It has been getting worse over the past month.',
    location_description: 'Ponsonby Rd, between Franklin Rd and Mackelvie St',
    reporter_name: null, created_at: '2025-03-03T14:30:00Z', photo: null,
  },
  {
    id: 3, title: 'Playground slide damaged at Victoria Park',
    category: 'park', status: 'resolved',
    description: 'The main slide at the children\'s playground has a crack near the top that could cause injury to children.',
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
    description: 'The roof of the bus shelter has partially collapsed after last week\'s storm. Sharp metal edges are exposed.',
    location_description: 'Great North Rd stop, Grey Lynn, outside No. 165',
    reporter_name: 'Mohammed A.', created_at: '2025-03-06T07:30:00Z', photo: null,
  },
]

const ALL_STATUS_FILTER = { id: 'all', label: 'All Status' }

export default function ViewRequestsPage() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [usedMock, setUsedMock] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('grid')

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Wrapped in useCallback so the function reference stays stable between renders —
  // without this, the useEffect below would re-run on every render in an infinite loop.
  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (statusFilter !== 'all') params.status = statusFilter
      if (categoryFilter !== 'all') params.category = categoryFilter
      if (search.trim()) params.search = search.trim()

      const res = await requestsApi.list(params)
      const data = res.data
      // DRF can return either a plain array (pagination disabled) or a paginated
      // object with { results, count }. We handle both shapes so this works
      // regardless of how the backend is configured.
      const isValidArray = Array.isArray(data)
      const isValidPaginated = data && typeof data === 'object' && Array.isArray(data.results)
      if (!isValidArray && !isValidPaginated) throw new Error('Unexpected API response')

      if (isValidArray) {
        setIssues(data)
        setTotalCount(data.length)
      } else {
        setIssues(data.results)
        setTotalCount(data.count || data.results.length)
      }
      setUsedMock(false)
    } catch {
      // Backend is offline — fall back to mock data and filter/paginate it client-side
      // so the page still works during development and demo presentations.
      setUsedMock(true)
      let filtered = [...MOCK_ISSUES]
      if (statusFilter !== 'all') filtered = filtered.filter(i => i.status === statusFilter)
      if (categoryFilter !== 'all') filtered = filtered.filter(i => i.category === categoryFilter)
      if (search.trim()) {
        const q = search.toLowerCase()
        filtered = filtered.filter(i =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.location_description || '').toLowerCase().includes(q)
        )
      }
      setTotalCount(filtered.length)
      const start = (page - 1) * PAGE_SIZE
      setIssues(filtered.slice(start, start + PAGE_SIZE))
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, categoryFilter, search])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  // Reset to page 1 whenever the user changes a filter or search query — otherwise
  // they could be on page 3 and get zero results after narrowing the filter.
  useEffect(() => { setPage(1) }, [statusFilter, categoryFilter, search])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setStatusFilter('all')
    setCategoryFilter('all')
    setSearch('')
  }

  return (
    <div className="section-container py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100">Community Reports</h1>
          <p className="mt-1 text-slate-400 text-sm">
            {loading ? 'Loading…' : `${totalCount.toLocaleString()} report${totalCount !== 1 ? 's' : ''} submitted`}
            {usedMock && (
              <span className="ml-2 text-amber-400 text-xs">(demo data — backend offline)</span>
            )}
          </p>
        </div>
        <Link to="/report" className="btn-primary text-sm px-5 py-2.5 shrink-0">
          + Report Issue
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, or location…"
            className="form-input pl-10 pr-10"
            aria-label="Search reports"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1 text-slate-500"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn-secondary text-sm px-4 py-2.5 gap-2 shrink-0 ${showFilters ? 'border-indigo-500/50 text-indigo-300' : ''}`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilters > 0 && (
            <span
              className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
            >
              {activeFilters}
            </span>
          )}
        </button>

        <div className="glass-sm flex rounded-xl overflow-hidden shrink-0">
          {[
            { mode: 'grid', Icon: LayoutGrid },
            { mode: 'list', Icon: List },
          ].map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-2.5 transition-colors ${
                viewMode === mode
                  ? 'text-indigo-400 bg-indigo-400/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label={`${mode} view`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        <button
          onClick={fetchIssues}
          className="btn-ghost px-3 py-2.5 shrink-0"
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {showFilters && (
        <div className="glass-sm p-4 mb-4 flex flex-col gap-4 animate-slide-down">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="form-label mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {[ALL_STATUS_FILTER, ...STATUSES].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`filter-pill ${statusFilter === s.id ? 'active' : ''}`}
                  >
                    {s.id !== 'all' && <StatusBadge status={s.id} size="sm" />}
                    {s.id === 'all' && s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="form-label mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
                >
                  All Categories
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`filter-pill ${categoryFilter === cat.id ? 'active' : ''}`}
                    style={categoryFilter === cat.id ? { color: cat.color, borderColor: cat.color + '60', background: cat.bgColor } : {}}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeFilters > 0 && (
            <button onClick={clearFilters} className="btn-ghost text-xs text-rose-400 self-start gap-1">
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {activeFilters > 0 && !showFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-slate-500">Active filters:</span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="filter-pill active text-xs gap-1"
            >
              <StatusBadge status={statusFilter} size="sm" />
              <X size={10} />
            </button>
          )}
          {categoryFilter !== 'all' && (
            <button
              onClick={() => setCategoryFilter('all')}
              className="filter-pill active text-xs gap-1"
            >
              {CATEGORIES.find(c => c.id === categoryFilter)?.label}
              <X size={10} />
            </button>
          )}
          <button onClick={clearFilters} className="btn-ghost text-xs text-rose-400 gap-1">
            Clear all
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-3xl'}`}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div
          className="glass flex flex-col items-center gap-4 py-16 text-center"
          style={{ borderColor: 'rgba(239,68,68,0.3)' }}
        >
          <AlertTriangle size={36} className="text-rose-400" />
          <div>
            <p className="font-semibold text-slate-200">Failed to load reports</p>
            <p className="text-sm text-slate-400 mt-1">{error}</p>
          </div>
          <button onClick={fetchIssues} className="btn-secondary text-sm gap-2">
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      ) : issues.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No reports found"
          description={
            search || activeFilters > 0
              ? 'Try adjusting your search or clearing filters.'
              : 'Be the first to report a public facility issue in your area.'
          }
          action={search || activeFilters > 0
            ? null
            : { to: '/report', label: '+ Report an Issue' }
          }
        />
      ) : (
        <>
          <div
            className={`grid gap-4 ${
              viewMode === 'grid'
                ? 'sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 max-w-3xl mx-auto'
            }`}
          >
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="btn-secondary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        page === p
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-100 bg-white/[0.03] hover:bg-white/[0.07]'
                      }`}
                      style={page === p ? {
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        boxShadow: '0 0 12px rgba(102,126,234,0.4)',
                      } : {}}
                    >
                      {p}
                    </button>
                  )
                })}
                {totalPages > 7 && <span className="text-slate-500 text-sm">…</span>}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="btn-secondary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
