import { useEffect, useMemo, useRef, useState } from 'react'
import { X, MapPin, CheckCircle2, Loader2, Search } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { mapStylesForTheme } from '../utils/googleMapStyles'

const DEFAULT_CENTER = { lat: -36.8485, lng: 174.7633 } // Auckland CBD
const DEFAULT_ZOOM = 14
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

export default function LocationPickerModal({
  open,
  title = 'Pick the exact location',
  initialLat,
  initialLng,
  onClose,
  onPick,
}) {
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const clickListenerRef = useRef(null)
  const { theme } = useTheme()

  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [picked, setPicked] = useState(null) // {lat, lng}
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const initialCenter = useMemo(() => {
    if (initialLat != null && initialLng != null) {
      return { lat: Number(initialLat), lng: Number(initialLng) }
    }
    return DEFAULT_CENTER
  }, [initialLat, initialLng])

  useEffect(() => {
    if (!open) return
    if (!API_KEY) {
      setLoadError('Missing Google Maps API key (VITE_GOOGLE_MAPS_API_KEY).')
      return
    }

    let cancelled = false
    setLoadError(null)
    setLoading(true)

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled) return
        if (!mapElRef.current) return

        // Init map once per open session
        const map = new maps.Map(mapElRef.current, {
          center: initialCenter,
          zoom: DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: mapStylesForTheme(theme),
        })
        mapRef.current = map

        // Pre-place marker if we already have coords
        if (initialLat != null && initialLng != null) {
          const pos = { lat: Number(initialLat), lng: Number(initialLng) }
          markerRef.current = new maps.Marker({ map, position: pos })
          setPicked(pos)
        } else {
          setPicked(null)
        }

        // Click to drop/move marker
        clickListenerRef.current = map.addListener('click', (e) => {
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
          if (!markerRef.current) {
            markerRef.current = new maps.Marker({ map, position: pos })
          } else {
            markerRef.current.setPosition(pos)
          }
          setPicked(pos)
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load Google Maps. Please check your connection and API key.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
      try {
        if (clickListenerRef.current) clickListenerRef.current.remove()
      } catch { /* ignore */ }
      clickListenerRef.current = null
      markerRef.current = null
      mapRef.current = null
    }
  }, [open, initialCenter, initialLat, initialLng, theme])

  // Live theme switching while the picker is open.
  useEffect(() => {
    if (!open) return
    if (!mapRef.current) return
    mapRef.current.setOptions({ styles: mapStylesForTheme(theme) })
  }, [open, theme])

  const handleSearch = async (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchError('')
    try {
      // Use Nominatim for forward geocoding — no API key needed, works on localhost
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=nz`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      if (!data?.length) {
        setSearchError('No results found. Try a more specific address.')
        return
      }
      const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      if (mapRef.current) {
        const maps = await loadGoogleMaps()
        mapRef.current.panTo(pos)
        mapRef.current.setZoom(16)
        if (!markerRef.current) {
          markerRef.current = new maps.Marker({ map: mapRef.current, position: pos })
        } else {
          markerRef.current.setPosition(pos)
        }
      }
      setPicked(pos)
    } catch {
      setSearchError('Search failed. Please check your connection and try again.')
    } finally {
      setSearching(false)
    }
  }

  const confirm = async () => {
    if (!picked) return
    setConfirming(true)
    try {
      // Try to reverse-geocode the clicked point for a nice address (optional)
      let address = null
      try {
        const maps = await loadGoogleMaps()
        const geocoder = new maps.Geocoder()
        const res = await geocoder.geocode({ location: picked })
        address = res?.results?.[0]?.formatted_address || null
      } catch {
        address = null
      }
      onPick?.({ lat: picked.lat, lng: picked.lng, address })
    } finally {
      setConfirming(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close location picker"
      />

      <div className="relative w-full max-w-3xl glass rounded-2xl overflow-hidden border border-white/10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-indigo-400" />
            <div>
              <div className="text-sm font-semibold text-slate-100">{title}</div>
              <div className="text-xs text-slate-400">Search an address or click the map to drop a pin</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-2 text-xs gap-1.5">
            <X size={14} /> Close
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Address search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchError('') }}
                placeholder="Search address or landmark…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400/60"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="btn-secondary px-4 py-2 text-sm gap-1.5 shrink-0"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </button>
          </form>
          {searchError && (
            <p className="text-xs text-rose-400 mb-2">{searchError}</p>
          )}

          {loadError ? (
            <div className="text-sm text-rose-300">{loadError}</div>
          ) : (
            <>
              <div
                ref={mapElRef}
                style={{ height: 380, borderRadius: 12 }}
                className="border border-white/10"
              />
              {loading && (
                <div className="mt-3 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Loading map…
                </div>
              )}
              {!loading && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    {picked
                      ? `Selected: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
                      : 'No location selected yet.'}
                  </div>
                  <button
                    type="button"
                    className="btn-primary px-5 py-2.5 text-sm gap-2"
                    onClick={confirm}
                    disabled={!picked || confirming}
                  >
                    {confirming
                      ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                      : <><CheckCircle2 size={16} /> Use this spot</>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
