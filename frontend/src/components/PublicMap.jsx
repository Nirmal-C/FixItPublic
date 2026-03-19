/**
 * PublicMap — citizen-facing Google Maps view of all reported issues.
 * Reads VITE_GOOGLE_MAPS_API_KEY from the environment.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Filter } from 'lucide-react'
import { CATEGORY_MAP, STATUS_MAP, CATEGORIES, STATUSES } from '../utils/constants'

const DEFAULT_CENTER = { lat: -36.8485, lng: 174.7633 }
const DEFAULT_ZOOM   = 13
const API_KEY        = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let gmapsReady = null
function loadGoogleMaps() {
  if (gmapsReady) return gmapsReady
  gmapsReady = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return }
    const cb = `_gmaps_cb_${Date.now()}`
    window[cb] = () => resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=${cb}`
    script.async = true
    script.onerror = reject
    document.head.appendChild(script)
  })
  return gmapsReady
}

function makeSvgIcon(catColor, statusColor) {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
      <path d="M18 2C10.3 2 4 8.3 4 16c0 11 14 30 14 30S32 27 32 16C32 8.3 25.7 2 18 2z"
            fill="${catColor}" stroke="white" stroke-width="1.5"
            style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>
      <circle cx="18" cy="16" r="6" fill="white" opacity="0.95"/>
      <circle cx="18" cy="16" r="4" fill="${statusColor}"/>
    </svg>`)
  return { url: `data:image/svg+xml,${svg}` }
}

function buildInfoWindowContent(ticket) {
  const cat  = CATEGORY_MAP[ticket.category] || CATEGORY_MAP['other']
  const stat = STATUS_MAP[ticket.status]     || STATUS_MAP['pending']
  const date = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(ticket.created_at))
  return `
    <div style="font-family:Inter,system-ui,sans-serif;min-width:220px;max-width:280px;padding:4px 2px">
      <p style="font-size:11px;color:#94a3b8;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">#${ticket.id}</p>
      <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 8px;line-height:1.3">${ticket.title}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${cat.bgColor};color:${cat.color};border:1px solid ${cat.color}40">${cat.label}</span>
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${stat.bgColor};color:${stat.color};border:1px solid ${stat.color}40">${stat.label}</span>
      </div>
      ${ticket.location_description ? `<p style="font-size:12px;color:#64748b;margin:0 0 6px">📍 ${ticket.location_description}</p>` : ''}
      <p style="font-size:11px;color:#94a3b8;margin:0 0 10px">${date}</p>
      <a href="/track/${ticket.id}"
         style="display:block;text-align:center;background:#0077C8;color:white;font-size:12px;font-weight:700;
                text-decoration:none;padding:8px 12px;border-radius:8px">
        Track this report →
      </a>
    </div>`
}

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

export default function PublicMap({ tickets = [], loading = false }) {
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef     = useRef([])
  const infoWindowRef  = useRef(null)

  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus,   setActiveStatus]   = useState('all')
  const [showFilters,    setShowFilters]     = useState(false)

  const mappedTickets    = tickets.filter(t => t.lat && t.lng)
  const mappedCategories = [...new Set(mappedTickets.map(t => t.category))]

  const filteredTickets = mappedTickets.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false
    if (activeStatus   !== 'all' && t.status   !== activeStatus)   return false
    return true
  })

  // Init map
  useEffect(() => {
    if (!mapRef.current || !API_KEY) return
    loadGoogleMaps().then((maps) => {
      if (mapInstanceRef.current) return
      const map = new maps.Map(mapRef.current, {
        center:    DEFAULT_CENTER,
        zoom:      DEFAULT_ZOOM,
        mapTypeId: 'roadmap',
        styles: [
          { elementType: 'geometry',          stylers: [{ color: '#0e1c2e' }] },
          { elementType: 'labels.text.fill',  stylers: [{ color: '#8ba8c4' }] },
          { elementType: 'labels.text.stroke',stylers: [{ color: '#0c1829' }] },
          { featureType: 'road',              elementType: 'geometry',       stylers: [{ color: '#1a3050' }] },
          { featureType: 'road',              elementType: 'geometry.stroke',stylers: [{ color: '#0c1829' }] },
          { featureType: 'road.highway',      elementType: 'geometry',       stylers: [{ color: '#1e4080' }] },
          { featureType: 'water',             elementType: 'geometry',       stylers: [{ color: '#0a1628' }] },
          { featureType: 'poi',               elementType: 'geometry',       stylers: [{ color: '#0e2040' }] },
          { featureType: 'poi',               elementType: 'labels.text.fill', stylers: [{ color: '#5c7a96' }] },
          { featureType: 'transit',           elementType: 'geometry',       stylers: [{ color: '#122040' }] },
          { featureType: 'administrative',    elementType: 'geometry',       stylers: [{ color: '#1a3050' }] },
          { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#8ba8c4' }] },
          { featureType: 'administrative.locality',elementType: 'labels.text.fill', stylers: [{ color: '#a8c4da' }] },
        ],
        disableDefaultUI:  false,
        zoomControl:       true,
        streetViewControl: false,
        mapTypeControl:    false,
        fullscreenControl: true,
      })

      infoWindowRef.current  = new maps.InfoWindow()
      mapInstanceRef.current = map

      // Force resize after layout settles so the map fills its container
      // correctly on first render (fixes blank map until theme toggle)
      setTimeout(() => {
        maps.event.trigger(map, 'resize')
        map.setCenter(DEFAULT_CENTER)
      }, 150)
    })

    return () => {
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
      mapInstanceRef.current = null
    }
  }, [])

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current) return
    loadGoogleMaps().then((maps) => {
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
      filteredTickets.forEach((ticket) => {
        const cat  = CATEGORY_MAP[ticket.category] || CATEGORY_MAP['other']
        const stat = STATUS_MAP[ticket.status]     || STATUS_MAP['pending']
        const icon = makeSvgIcon(cat.color, stat.color)
        const marker = new maps.Marker({
          position: { lat: ticket.lat, lng: ticket.lng },
          map:      mapInstanceRef.current,
          title:    ticket.title,
          icon: {
            url:        icon.url,
            scaledSize: new maps.Size(36, 48),
            anchor:     new maps.Point(18, 48),
          },
        })
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(buildInfoWindowContent(ticket))
          infoWindowRef.current.open(mapInstanceRef.current, marker)
        })
        markersRef.current.push(marker)
      })
      if (markersRef.current.length > 0) {
        const bounds = new maps.LatLngBounds()
        markersRef.current.forEach(m => bounds.extend(m.getPosition()))
        mapInstanceRef.current.fitBounds(bounds)
        maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
          if (mapInstanceRef.current.getZoom() > 16) mapInstanceRef.current.setZoom(16)
        })
      }
    })
  }, [filteredTickets.length, activeCategory, activeStatus])

  const activeFilterCount = (activeCategory !== 'all' ? 1 : 0) + (activeStatus !== 'all' ? 1 : 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Issue Map</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,119,200,0.15)', color: 'var(--accent-text)' }}>
            {mappedTickets.length} mapped
          </span>
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: showFilters ? 'rgba(0,119,200,0.2)' : 'rgba(255,255,255,0.05)',
            color: showFilters ? 'var(--accent-text)' : 'var(--text-secondary)',
            border: '1px solid ' + (showFilters ? 'rgba(0,119,200,0.4)' : 'rgba(255,255,255,0.1)'),
          }}>
          <Filter size={12} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="glass p-4 flex flex-col gap-4 animate-slide-up">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Category</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All" active={activeCategory === 'all'} color="var(--accent)" onClick={() => setActiveCategory('all')} />
              {CATEGORIES.filter(c => mappedCategories.includes(c.id)).map(c => (
                <FilterChip key={c.id} label={c.label} active={activeCategory === c.id} color={c.color} onClick={() => setActiveCategory(c.id)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Status</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All" active={activeStatus === 'all'} color="var(--accent)" onClick={() => setActiveStatus('all')} />
              {STATUSES.map(s => (
                <FilterChip key={s.id} label={s.label} active={activeStatus === s.id} color={s.color} onClick={() => setActiveStatus(s.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full rounded-2xl overflow-hidden"
        style={{ height: 500, border: '1px solid var(--card-border)', position: 'relative' }}>
        {!API_KEY && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--card-bg)' }}>
            <p className="text-sm text-rose-400">VITE_GOOGLE_MAPS_API_KEY is not set</p>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(12,24,41,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}
        {!loading && mappedTickets.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div className="glass px-5 py-4 text-center max-w-xs">
              <MapPin size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No mapped issues yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Reports with GPS coordinates will appear here</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 px-1">
        {CATEGORIES.filter(c => mappedCategories.includes(c.id)).map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}