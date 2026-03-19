import { useEffect, useMemo, useRef, useState } from 'react'
import { X, MapPin, CheckCircle2, Loader2 } from 'lucide-react'
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
              <div className="text-xs text-slate-400">Click the map to drop a pin</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-2 text-xs gap-1.5">
            <X size={14} /> Close
          </button>
        </div>

        <div className="px-5 py-4">
          {loadError ? (
            <div className="text-sm text-rose-300">{loadError}</div>
          ) : (
            <>
              <div
                ref={mapElRef}
                style={{ height: 420, borderRadius: 12 }}
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
