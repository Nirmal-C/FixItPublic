/**
 * PublicMap — citizen-facing Google Maps view of all reported issues.
 */

import { useEffect, useRef, useState } from 'react'
import { MapPin, Filter } from 'lucide-react'
import { CATEGORY_MAP, STATUS_MAP, CATEGORIES, STATUSES } from '../utils/constants'
import { useTheme } from '../contexts/ThemeContext'
import { mapStylesForTheme } from '../utils/googleMapStyles'

const DEFAULT_CENTER = { lat: -36.8485, lng: 174.7633 }
const DEFAULT_ZOOM = 13
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let gmapsReady = null
function loadGoogleMaps() {
  if (gmapsReady) return gmapsReady

  gmapsReady = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps)
      return
    }

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

function makeSvgIcon(catColor, statusColor) {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48">
      <path d="M18 2C10.3 2 4 8.3 4 16c0 11 14 30 14 30S32 27 32 16C32 8.3 25.7 2 18 2z"
        fill="${catColor}" stroke="white" stroke-width="1.5"/>
      <circle cx="18" cy="16" r="6" fill="white"/>
      <circle cx="18" cy="16" r="4" fill="${statusColor}"/>
    </svg>`)

  return { url: `data:image/svg+xml,${svg}` }
}

function buildInfoWindowContent(ticket) {
  const cat = CATEGORY_MAP[ticket.category] || CATEGORY_MAP['other']
  const stat = STATUS_MAP[ticket.status] || STATUS_MAP['pending']

  const date = new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(ticket.created_at))

  return `
    <div style="font-family:sans-serif;min-width:220px">
      <strong>${ticket.title}</strong><br/>
      <small>${cat.label} • ${stat.label}</small><br/>
      <small>${date}</small>
    </div>`
}

function FilterChip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1 rounded-full"
      style={{
        background: active ? color + '22' : 'rgba(255,255,255,0.04)',
        color: active ? color : '#94a3b8',
        border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`
      }}
    >
      {label}
    </button>
  )
}

export default function PublicMap({ tickets = [], loading = false }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)
  const { theme } = useTheme()

  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // ✅ FIXED: allow 0 and strings
  const mappedTickets = tickets
    .filter(t => t.lat != null && t.lng != null)
    .map(t => ({
      ...t,
      lat: Number(t.lat),
      lng: Number(t.lng)
    }))

  const mappedCategories = [...new Set(mappedTickets.map(t => t.category))]

  const filteredTickets = mappedTickets.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false
    if (activeStatus !== 'all' && t.status !== activeStatus) return false
    return true
  })

  // ✅ Initialize map ONCE
  useEffect(() => {
    if (!mapRef.current || !API_KEY) return

    loadGoogleMaps().then((maps) => {
      if (mapInstanceRef.current) return

      const map = new maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        styles: mapStylesForTheme(theme),
      })

      infoWindowRef.current = new maps.InfoWindow()
      mapInstanceRef.current = map
    })

    // ✅ FIXED cleanup (no crash)
    return () => {
      markersRef.current = []
      mapInstanceRef.current = null
    }
  }, [])

  // Apply theme styles live when the user toggles dark/light.
  useEffect(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setOptions({ styles: mapStylesForTheme(theme) })
  }, [theme])

  // ✅ Update markers safely
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    loadGoogleMaps().then((maps) => {
      if (!mapInstanceRef.current || mapInstanceRef.current !== map) return
      // clear old markers
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []

      filteredTickets.forEach(ticket => {
        const cat = CATEGORY_MAP[ticket.category] || CATEGORY_MAP['other']
        const stat = STATUS_MAP[ticket.status] || STATUS_MAP['pending']

        const marker = new maps.Marker({
          position: { lat: ticket.lat, lng: ticket.lng },
          map,
          title: ticket.title,
          icon: {
            url: makeSvgIcon(cat.color, stat.color).url,
            scaledSize: new maps.Size(36, 48),
            anchor: new maps.Point(18, 48)
          }
        })

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(buildInfoWindowContent(ticket))
          infoWindowRef.current.open(map, marker)
        })

        markersRef.current.push(marker)
      })

      // fit bounds
      if (markersRef.current.length > 0) {
        const bounds = new maps.LatLngBounds()
        markersRef.current.forEach(m => bounds.extend(m.getPosition()))
        map.fitBounds(bounds)
      }
    })
  }, [filteredTickets])

  const activeFilterCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (activeStatus !== 'all' ? 1 : 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>Issue Map</span>
          <span>{mappedTickets.length} mapped</span>
        </div>

        <button onClick={() => setShowFilters(v => !v)}>
          <Filter size={12} /> Filters ({activeFilterCount})
        </button>
      </div>

      {showFilters && (
        <div>
          <div>
            <strong>Category</strong>
            <div>
              <FilterChip label="All" active={activeCategory === 'all'} color="#0077C8" onClick={() => setActiveCategory('all')} />
              {CATEGORIES.filter(c => mappedCategories.includes(c.id)).map(c => (
                <FilterChip key={c.id} label={c.label} active={activeCategory === c.id} color={c.color} onClick={() => setActiveCategory(c.id)} />
              ))}
            </div>
          </div>

          <div>
            <strong>Status</strong>
            <div>
              <FilterChip label="All" active={activeStatus === 'all'} color="#0077C8" onClick={() => setActiveStatus('all')} />
              {STATUSES.map(s => (
                <FilterChip key={s.id} label={s.label} active={activeStatus === s.id} color={s.color} onClick={() => setActiveStatus(s.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        style={{ height: 500, borderRadius: 12 }}
      />

      {!loading && mappedTickets.length === 0 && (
        <p>No mapped issues yet</p>
      )}
    </div>
  )
}
