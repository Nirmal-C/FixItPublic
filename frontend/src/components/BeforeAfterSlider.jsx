import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowLeftRight } from 'lucide-react'

/**
 * Drag-to-reveal before/after photo comparison slider.
 * Drag the centre handle left/right to compare two images.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
}) {
  const [position, setPosition] = useState(50) // 0–100 %
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const clamp = (v) => Math.max(2, Math.min(98, v))

  const updateFromClientX = useCallback((clientX) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    setPosition(clamp((x / rect.width) * 100))
  }, [])

  // Mouse events
  const onMouseDown = (e) => {
    dragging.current = true
    updateFromClientX(e.clientX)
  }
  const onMouseMove = useCallback((e) => {
    if (dragging.current) updateFromClientX(e.clientX)
  }, [updateFromClientX])
  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  // Touch events
  const onTouchStart = (e) => updateFromClientX(e.touches[0].clientX)
  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    updateFromClientX(e.touches[0].clientX)
  }, [updateFromClientX])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden select-none"
      style={{ aspectRatio: '16/9', cursor: 'col-resize', touchAction: 'none' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      {/* After image — full width, sits underneath */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before image — clipped to the left portion via clip-path */}
      <img
        src={beforeSrc}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5"
        style={{
          left: `${position}%`,
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.9)',
          boxShadow: '0 0 12px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}
      >
        {/* Drag handle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     w-9 h-9 rounded-full flex items-center justify-center shadow-2xl"
          style={{ background: '#ffffff', border: '2px solid rgba(255,255,255,0.8)' }}
        >
          <ArrowLeftRight size={15} className="text-slate-700" />
        </div>
      </div>

      {/* BEFORE label */}
      <span
        className="absolute top-2.5 left-3 text-[9px] font-bold tracking-widest uppercase
                   px-2 py-0.5 rounded-full pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}
      >
        {beforeLabel}
      </span>

      {/* AFTER label */}
      <span
        className="absolute top-2.5 right-3 text-[9px] font-bold tracking-widest uppercase
                   px-2 py-0.5 rounded-full pointer-events-none"
        style={{ background: 'rgba(16,185,129,0.7)', color: '#ffffff', backdropFilter: 'blur(4px)' }}
      >
        {afterLabel}
      </span>

      {/* Drag hint — fades after first interaction */}
      {position === 50 && (
        <div
          className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }}
        >
          <span className="text-[10px] text-white/70 font-medium tracking-wide flex items-center gap-1">
            <ArrowLeftRight size={10} /> Drag to compare
          </span>
        </div>
      )}
    </div>
  )
}
