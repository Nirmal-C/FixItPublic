/**
 * AdminMap — admin-facing Google Maps view with full ticket detail.
 *
 * Beyond PublicMap this adds:
 *  - Full reporter + crew detail in InfoWindow
 *  - Escalated tickets get a red alert badge on the pin
 *  - Map type toggle: Roadmap / Satellite / Hybrid / Terrain
 *  - Quick status-change buttons inside the detail panel
 *  - Status count strip (click to filter)
 *  - Unmapped tickets accordion
 *  - "Reset view" button
 *
 * Reads VITE_GOOGLE_MAPS_API_KEY from the environment.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MapPin, AlertTriangle, Wrench, Users,
  Navigation, Eye, BarChart2,
} from 'lucide-react'
import { CATEGORY_MAP, STATUS_MAP, CATEGORIES, STATUSES, CREW_MAP } from '../utils/constants'
import { useTheme } from '../contexts/ThemeContext'
import { mapStylesForTheme } from '../utils/googleMapStyles'

const DEFAULT_CENTER = { lat: -36.8485, lng: 174.7633 }
const DEFAULT_ZOOM   = 12
const API_KEY        = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let gmapsReady = null
function loadGoogleMaps() {
  if (gmapsReady) return gmapsReady
  gmapsReady = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return }
    const cb = `_gmaps_cb_${Date.now()}`
    window[cb] = () => resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=${cb}&loading=async`
    script.async = true
    script.onerror = reject
    document.head.appendChild(script)
  })
  return gmapsReady
}

function makeSvgIcon(catColor, statusColor, escalated = false) {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
      <path d="M20 2C11.2 2 4 9.2 4 18c0 12.5 16 32 16 32S36 30.5 36 18C36 9.2 28.8 2 20 2z"
            fill="${catColor}" stroke="white" stroke-width="1.5"
            style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.5))"/>
      <circle cx="20" cy="18" r="7" fill="white" opacity="0.95"/>
      <circle cx="20" cy="18" r="4.5" fill="${statusColor}"/>
      ${escalated
        ? `<circle cx="31" cy="9" r="7" fill="#ef4444" stroke="white" stroke-width="2"/>
           <text x="31" y="13" text-anchor="middle" font-size="9" font-weight="900" fill="white">!</text>`
        : ''}
    </svg>`)
  return {
    url: `data:image/svg+xml,${svg}`,
    w: escalated ? 40 : 36,
    h: escalated ? 52 : 48,
  }
}

const STATUS_TRANSITIONS = {
  pending:     ['in_progress', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved:    ['closed'],
  closed:      [],
}

const MAP_TYPES = [
  { id: 'roadmap',   label: 'Map'       },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid',    label: 'Hybrid'    },
  { id: 'terrain',   label: 'Terrain'   },
]

function FilterChip({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} className="text-xs px-3 py-1 rounded-full transition-all font-medium"
      style={{
        background: active ? color + '22' : 'rgba(255,255,255,0.04)',
        color: active ? color : 'var(--text-muted)',
        border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.08)'}`,
      }}>
      {label}
    </button>
  )
}

function InfoRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <div className="min-w-0 text-xs">
        <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}: </span>
        <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
      </div>
    </div>
  )
}

export default function AdminMap({ tickets = [], loading = false, onStatusChange }) {
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef     = useRef([])
  const infoWindowRef  = useRef(null)
  const { theme } = useTheme()

  const [selectedTicket, setSelectedTicket] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus,   setActiveStatus]   = useState('all')
  const [mapType,        setMapType]        = useState('roadmap')
  const [showUnmapped,   setShowUnmapped]   = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  // Allow 0 and string values; only treat null/undefined as "missing GPS".
  const mappedTickets    = tickets
    .filter(t => t.lat != null && t.lng != null)
    .map(t => ({ ...t, lat: Number(t.lat), lng: Number(t.lng) }))
  const unmappedTickets  = tickets.filter(t => t.lat == null || t.lng == null)
  const escalatedCount   = mappedTickets.filter(t => t.escalated).length
  const mappedCategories = [...new Set(mappedTickets.map(t => t.category))]

  const filteredTickets = mappedTickets.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false
    if (activeStatus   !== 'all' && t.status   !== activeStatus)   return false
    return true
  })

  // Init map
  useEffect(() => {
    if (!mapRef.current || !API_KEY) return
    let isMounted = true
    loadGoogleMaps().then((maps) => {
      if (!isMounted || mapInstanceRef.current) return
      const map = new maps.Map(mapRef.current, {
        center:            DEFAULT_CENTER,
        zoom:              DEFAULT_ZOOM,
        mapTypeId:         'roadmap',
        styles:            mapStylesForTheme(theme),
        disableDefaultUI:  false,
        zoomControl:       true,
        streetViewControl: false,
        mapTypeControl:    false,
        fullscreenControl: true,
      })
      infoWindowRef.current  = new maps.InfoWindow()
      mapInstanceRef.current = map
    })
    return () => {
      isMounted = false
      markersRef.current = []
      mapInstanceRef.current = null
    }
  }, [])

  // Apply theme styles live when the user toggles dark/light.
  useEffect(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setOptions({ styles: mapStylesForTheme(theme) })
  }, [theme])

  // Map type switch
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current
    loadGoogleMaps().then(() => {
      if (!mapInstanceRef.current || mapInstanceRef.current !== map) return
      map.setMapTypeId(mapType)
    })
  }, [mapType])

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current
    loadGoogleMaps().then((maps) => {
      // If the map was cleaned up while the Maps script was loading, bail out.
      if (!mapInstanceRef.current || mapInstanceRef.current !== map) return
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
      filteredTickets.forEach((ticket) => {
        const cat  = CATEGORY_MAP[ticket.category] || CATEGORY_MAP['other']
        const stat = STATUS_MAP[ticket.status]      || STATUS_MAP['pending']
        const icon = makeSvgIcon(cat.color, stat.color, ticket.escalated)
        const marker = new maps.Marker({
          position: { lat: ticket.lat, lng: ticket.lng },
          map,
          title:    ticket.title,
          icon: {
            url:        icon.url,
            scaledSize: new maps.Size(icon.w, icon.h),
            anchor:     new maps.Point(icon.w / 2, icon.h),
          },
        })
        marker.addListener('click', () => {
          setSelectedTicket(ticket)
          infoWindowRef.current.close()
        })
        markersRef.current.push(marker)
      })
      if (markersRef.current.length > 0) {
        const bounds = new maps.LatLngBounds()
        markersRef.current.forEach(m => bounds.extend(m.getPosition()))
        map.fitBounds(bounds)
        maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (!mapInstanceRef.current || mapInstanceRef.current !== map) return
          if (map.getZoom() > 15) map.setZoom(15)
        })
      }
    })
  }, [filteredTickets.length, activeCategory, activeStatus, tickets.length])

  // Keep selectedTicket in sync on refresh
  useEffect(() => {
    if (!selectedTicket) return
    const updated = tickets.find(t => t.id === selectedTicket.id)
    if (updated) setSelectedTicket(updated)
  }, [tickets])

  const fitAll = useCallback(() => {
    if (!mapInstanceRef.current || markersRef.current.length === 0) return
    const map = mapInstanceRef.current
    loadGoogleMaps().then((maps) => {
      if (!mapInstanceRef.current || mapInstanceRef.current !== map) return
      const bounds = new maps.LatLngBounds()
      markersRef.current.forEach(m => bounds.extend(m.getPosition()))
      map.fitBounds(bounds)
    })
  }, [])

  const handleStatusChange = async (newStatus) => {
    if (!onStatusChange || !selectedTicket) return
    setChangingStatus(true)
    try { await onStatusChange(selectedTicket.id, newStatus) }
    finally { setChangingStatus(false) }
  }

  const nextStatuses = STATUS_TRANSITIONS[selectedTicket?.status] || []

  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            <MapPin size={16} style={{ color: 'var(--accent)' }} />
            Live Issue Map
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(0,119,200,0.15)', color: 'var(--accent-text)', border: '1px solid rgba(0,119,200,0.3)' }}>
            {mappedTickets.length} mapped
          </span>
          {escalatedCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={10} /> {escalatedCount} escalated
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {MAP_TYPES.map((t, i) => (
              <button key={t.id} onClick={() => setMapType(t.id)}
                className="px-2.5 py-1.5 text-xs transition-all"
                style={{
                  background: mapType === t.id ? 'rgba(0,119,200,0.25)' : 'rgba(255,255,255,0.03)',
                  color: mapType === t.id ? 'var(--accent-text)' : 'var(--text-muted)',
                  borderRight: i < MAP_TYPES.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={fitAll}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Navigation size={12} /> Fit all
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>Category:</span>
          <FilterChip label="All" active={activeCategory === 'all'} color="var(--accent)" onClick={() => setActiveCategory('all')} />
          {CATEGORIES.filter(c => mappedCategories.includes(c.id)).map(c => (
            <FilterChip key={c.id} label={c.label} active={activeCategory === c.id} color={c.color} onClick={() => setActiveCategory(c.id)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>Status:</span>
          <FilterChip label="All" active={activeStatus === 'all'} color="var(--accent)" onClick={() => setActiveStatus('all')} />
          {STATUSES.map(s => (
            <FilterChip key={s.id} label={s.label} active={activeStatus === s.id} color={s.color} onClick={() => setActiveStatus(s.id)} />
          ))}
        </div>
      </div>

      {/* Map + detail panel */}
      <div className="flex gap-3" style={{ minHeight: 480 }}>
        <div className="flex-1 rounded-2xl overflow-hidden relative"
          style={{ border: '1px solid var(--card-border)', minHeight: 440, position: 'relative' }}>
          {/* Important: keep Google Maps container free of React-managed children.
              Google mutates/clears the container DOM, which can break React deletion. */}
          <div ref={mapRef} className="absolute inset-0" />
          {!API_KEY && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--card-bg)' }}>
              <p className="text-sm text-rose-400">VITE_GOOGLE_MAPS_API_KEY is not set</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(12,24,41,0.75)', backdropFilter: 'blur(4px)' }}>
              <div className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          )}
          {!loading && mappedTickets.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
              <div className="glass px-6 py-5 text-center max-w-xs">
                <MapPin size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No GPS data yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tickets with coordinates will appear as pins</p>
              </div>
            </div>
          )}
        </div>

        {selectedTicket ? (
          <div className="w-72 shrink-0 glass p-4 flex flex-col gap-3 rounded-2xl animate-slide-up"
            style={{ maxHeight: 480, overflowY: 'auto' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>#{selectedTicket.id}</p>
                <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{selectedTicket.title}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)}
                className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-lg leading-none"
                style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const cat  = CATEGORY_MAP[selectedTicket.category] || CATEGORY_MAP['other']
                const stat = STATUS_MAP[selectedTicket.status]      || STATUS_MAP['pending']
                return (
                  <>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: cat.bgColor, color: cat.color, border: `1px solid ${cat.color}40` }}>
                      {cat.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: stat.bgColor, color: stat.color, border: `1px solid ${stat.color}40` }}>
                      {stat.label}
                    </span>
                    {selectedTicket.escalated && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <AlertTriangle size={9} /> Escalated
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
            <div style={{ borderTop: '1px solid var(--divider)' }} />
            <div className="flex flex-col gap-2">
              <InfoRow icon={<MapPin size={11} />} label="Location" value={selectedTicket.location_description} />
              {selectedTicket.lat && selectedTicket.lng && (
                <InfoRow icon={<MapPin size={11} />} label="Coords" value={`${selectedTicket.lat.toFixed(5)}, ${selectedTicket.lng.toFixed(5)}`} />
              )}
              <InfoRow icon={<Users size={11} />} label="Reporter"
                value={[selectedTicket.reporter_display || selectedTicket.reporter_name, selectedTicket.reporter_email].filter(Boolean).join(' · ')} />
              {selectedTicket.assigned_crew && (
                <InfoRow icon={<Wrench size={11} />} label="Crew"
                  value={(() => { const c = CREW_MAP[selectedTicket.assigned_crew]; return c ? `${c.label} — ${c.specialty}` : selectedTicket.assigned_crew })()} />
              )}
              {selectedTicket.escalation_level && (
                <InfoRow icon={<AlertTriangle size={11} />} label="Escalation"
                  value={selectedTicket.escalation_level.replace('_', ' ')} />
              )}
              <InfoRow icon={<span />} label="Reported"
                value={new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(selectedTicket.created_at))} />
            </div>
            {selectedTicket.description && (
              <p className="text-xs leading-relaxed line-clamp-5" style={{ color: 'var(--text-secondary)' }}>
                {selectedTicket.description}
              </p>
            )}
            {nextStatuses.length > 0 && onStatusChange && (
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Quick update</p>
                <div className="flex flex-col gap-1.5">
                  {nextStatuses.map(s => {
                    const next = STATUS_MAP[s]
                    return (
                      <button key={s} onClick={() => handleStatusChange(s)} disabled={changingStatus}
                        className="flex items-center gap-2 text-xs py-2 px-3 rounded-lg font-medium transition-all"
                        style={{ background: next.bgColor + 'aa', color: next.color, border: `1px solid ${next.color}40` }}>
                        {changingStatus
                          ? <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                          : <span className="w-2 h-2 rounded-full shrink-0" style={{ background: next.color }} />}
                        Mark as {next.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-64 shrink-0 glass flex flex-col items-center justify-center gap-3 rounded-2xl" style={{ minHeight: 440 }}>
            <Eye size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <p className="text-xs text-center px-4" style={{ color: 'var(--text-muted)' }}>Click any map pin to see full ticket details</p>
          </div>
        )}
      </div>

      {/* Status count strip */}
      {!loading && mappedTickets.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {STATUSES.map(s => {
            const count = mappedTickets.filter(t => t.status === s.id).length
            return (
              <button key={s.id} onClick={() => setActiveStatus(activeStatus === s.id ? 'all' : s.id)}
                className="glass p-3 flex flex-col gap-1 transition-all hover:scale-[1.02]"
                style={{ border: activeStatus === s.id ? `1px solid ${s.color}60` : '1px solid var(--card-border)' }}>
                <span className="text-xl font-extrabold" style={{ color: s.color }}>{count}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Unmapped accordion */}
      {unmappedTickets.length > 0 && (
        <div className="glass overflow-hidden">
          <button onClick={() => setShowUnmapped(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/[0.02]"
            style={{ color: 'var(--text-primary)', borderBottom: showUnmapped ? '1px solid var(--divider)' : 'none' }}>
            <span className="flex items-center gap-2">
              <BarChart2 size={14} style={{ color: '#94a3b8' }} />
              {unmappedTickets.length} tickets without GPS
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{showUnmapped ? '▲ hide' : '▼ show'}</span>
          </button>
          {showUnmapped && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                    {['ID', 'Title', 'Category', 'Status'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unmappedTickets.map(t => {
                    const cat  = CATEGORY_MAP[t.category] || CATEGORY_MAP['other']
                    const stat = STATUS_MAP[t.status]     || STATUS_MAP['pending']
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                        <td className="px-5 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>#{t.id}</td>
                        <td className="px-5 py-2.5 text-sm max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</td>
                        <td className="px-5 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cat.bgColor, color: cat.color }}>{cat.label}</span></td>
                        <td className="px-5 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: stat.bgColor, color: stat.color }}>{stat.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
        {CATEGORIES.filter(c => mappedCategories.includes(c.id)).map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={10} style={{ color: '#ef4444' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Escalated (red badge)</span>
        </div>
      </div>
    </div>
  )
}
