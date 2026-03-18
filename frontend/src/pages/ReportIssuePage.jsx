import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, X, CheckCircle2, AlertCircle, User, Mail,
  MapPin, FileText, Tag, Image as ImageIcon,
  Zap, Trees, Footprints, Construction, Building2, Bus, Paintbrush, HelpCircle,
  ChevronRight, Info, Crosshair, Loader2, BrainCircuit, Sparkles, Bell,
} from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { CATEGORIES, CATEGORY_MAP } from '../utils/constants'
import { validateReportForm, isFormValid } from '../utils/validation'
import { requestsApi } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

const AI_STEPS = [
  'Reading your description…',
  'Detecting issue category…',
  'Assessing priority level…',
  'Checking local asset history…',
  'Queuing for crew assignment…',
]

const PRIORITY_MAP = {
  road:          { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  bus_stop:      { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  streetlight:   { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  footpath:      { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  public_toilet: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  park:          { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  graffiti:      { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  other:         { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const REASONING_MAP = {
  road:          'Road damage detected. High traffic impact and potential safety risk — expedited review queued.',
  bus_stop:      'Infrastructure damage identified. Public safety concern flagged — high priority assigned.',
  streetlight:   'Lighting fault detected. Scheduled for nearest available electrical crew.',
  footpath:      'Footpath obstruction identified. Accessibility impact noted — medium priority assigned.',
  public_toilet: 'Public amenity issue logged. Maintenance team notified — medium priority.',
  park:          'Park facility issue logged. Scheduled for next available maintenance window.',
  graffiti:      'Graffiti removal queued. Crew assigned based on proximity and workload.',
  other:         'General issue logged. Routed to general maintenance team for review.',
}

// Maps icon name strings from the category constants to actual Lucide components.
// Only the icons we actually use are imported, which keeps the bundle smaller
// than doing a full `import * as LucideIcons` like IssueCard does.
const ICON_MAP = {
  Zap, Trees, Footprints, Construction, Building2, Bus, Paintbrush, HelpCircle,
}

const STEPS = [
  { id: 1, label: 'Category' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Your Info' },
]

const MAX_PHOTOS = 5

const INITIAL_FORM = {
  title: '',
  category: '',
  description: '',
  location_description: '',
  reporter_name: '',
  reporter_email: '',
  photos: [], // array of File objects, up to MAX_PHOTOS
}

export default function ReportIssuePage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [photoPreviews, setPhotoPreviews] = useState([]) // [{file, preview}]
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [aiPhase, setAiPhase] = useState(null) // null | 'analysing' | 'complete'
  const [aiStep, setAiStep] = useState(0)
  const [aiResult, setAiResult] = useState(null)
  // GPS auto-fill state — tracks whether we're waiting on the geolocation API
  const [gpsLoading, setGpsLoading] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const toast = useToast()
  const { permission: notifPermission, request: requestNotif, notify } = useNotifications()

  // Request notification permission then fire two timed notifications:
  // 1. Immediate — report received confirmation
  // 2. ~10 s later — simulated crew assignment (Sprint 3 demo; real push comes from backend)
  const fireSubmissionNotifications = async (ticketId) => {
    const perm = await requestNotif()
    if (perm !== 'granted') return

    // Slight delay so the user sees the in-app animation first
    setTimeout(() => {
      notify('Report received ✓', {
        body: `Your report #${ticketId} has been logged and is being triaged by the AI system.`,
        tag: `receipt-${ticketId}`,
        data: { url: `/track/${ticketId}` },
      })
    }, 2000)

    // Simulated assignment notification — Sprint 3 backend will send real push
    setTimeout(() => {
      notify('Crew assigned 🔧', {
        body: `A maintenance crew has been assigned to your report #${ticketId}. Tap to track.`,
        tag: `assigned-${ticketId}`,
        data: { url: `/track/${ticketId}` },
      })
    }, 12000)
  }

  // Drive the AI step animation — schedule all step timers upfront when analysing starts.
  useEffect(() => {
    if (aiPhase !== 'analysing') return
    setAiStep(0)
    const timers = AI_STEPS.map((_, i) =>
      setTimeout(() => setAiStep(i + 1), (i + 1) * 700)
    )
    const completeTimer = setTimeout(() => setAiPhase('complete'), (AI_STEPS.length + 1) * 700)
    return () => { timers.forEach(clearTimeout); clearTimeout(completeTimer) }
  }, [aiPhase])

  // Compute the AI result card data once the analysis is complete.
  useEffect(() => {
    if (aiPhase !== 'complete') return
    const cat = CATEGORY_MAP[form.category] || CATEGORY_MAP['other']
    const priority = PRIORITY_MAP[form.category] || PRIORITY_MAP['other']
    const confidence = Math.floor(Math.random() * 8 + 87) // 87–94 %
    const reasoning = REASONING_MAP[form.category] || REASONING_MAP['other']
    setAiResult({ cat, priority, confidence, reasoning })
  }, [aiPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Returns an onChange handler for the named form field so we don't need a
  // separate handler for every input. Clears that field's validation error on
  // first keystroke so the red message disappears while the user is fixing it.
  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
  }

  // Add one or more photos to the list (up to MAX_PHOTOS total).
  // Each file gets validated and a preview URL generated via FileReader.
  const addPhotos = useCallback((files) => {
    const current = form.photos
    const remaining = MAX_PHOTOS - current.length
    if (remaining <= 0) return
    const toAdd = Array.from(files).slice(0, remaining)
    toAdd.forEach((file) => {
      const photoErr = validateReportForm({ ...form, photo: file }).photo
      if (photoErr) {
        setErrors((prev) => ({ ...prev, photo: photoErr }))
        return
      }
      setErrors((prev) => ({ ...prev, photo: null }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, { file, preview: reader.result }])
        setForm((prev) => ({ ...prev, photos: [...prev.photos, file] }))
      }
      reader.readAsDataURL(file)
    })
  }, [form])

  const removePhoto = (index) => {
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addPhotos(e.dataTransfer.files)
  }

  // GPS auto-fill: grabs the device coordinates then calls Nominatim (OpenStreetMap's
  // free reverse-geocoding API) to convert lat/lng into a human-readable address.
  // We fill location_description so the admin can still edit it if needed.
const handleGpsClick = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.')
      return
    }
    setGpsLoading(true)

    // Try low-accuracy first (WiFi/IP based) — works reliably on desktops and
    // laptops that have no GPS chip. If that also fails we show a helpful message.
    // Two-pass approach: attempt 1 with enableHighAccuracy: false, if error code
    // is 2 (position unavailable) retry once with a longer timeout before giving up.
    const attempt = (highAccuracy, isRetry) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
              { headers: { 'Accept-Language': 'en' } }
            )
            const data = await res.json()
            // Nominatim returns a display_name like "42 Queen Street, Auckland CBD, Auckland, 1010, New Zealand"
            // We trim off the postcode + country to keep it concise for the form.
            const parts = (data.display_name || '').split(',')
            const trimmed = parts.slice(0, -2).join(',').trim()
            setForm((prev) => ({ ...prev, location_description: trimmed || data.display_name }))
            setErrors((prev) => ({ ...prev, location_description: null }))
            toast.success('Location filled in automatically!', { title: 'GPS detected' })
          } catch {
            // If Nominatim fails, fall back to raw coordinates — still useful for the team
            setForm((prev) => ({
              ...prev,
              location_description: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
            }))
            toast.warning('Could not reverse-geocode — raw coordinates used instead.')
          } finally {
            setGpsLoading(false)
          }
        },
        (err) => {
          // code 1 = permission denied — no point retrying
          // code 2 = position unavailable — retry once with high accuracy off
          // code 3 = timeout — retry once
          if (!isRetry && err.code !== 1) {
            // First failure — retry once with low accuracy and a longer timeout
            attempt(false, true)
            return
          }
          const msg = err.code === 1
            ? 'Location access denied. Please type your location manually.'
            : 'Could not detect your location. Please type it manually.'
          toast.error(msg)
          setGpsLoading(false)
        },
        {
          // Omitting timeout entirely — the browser will wait as long as needed
          // for the user to respond to the permission prompt before calling the
          // error callback. With an explicit timeout the callback fires while the
          // dialog is still showing, which produces a false "failed" message.
          // maximumAge reuses a cached position up to 1 min old so repeat clicks
          // are instant rather than triggering a fresh GPS lookup every time.
          enableHighAccuracy: highAccuracy,
          maximumAge: isRetry ? 0 : 60000,
        }
      )
    }
    attempt(false, false)
  }

  // Only validates fields relevant to the current step before letting the user proceed.
  // Running full validation upfront would highlight step 3 errors while the user is
  // still filling out step 1, which is confusing. We collect the full error set each
  // time but only surface the slice that belongs to this step.
  const validateStep = (s) => {
    const allErrors = validateReportForm(form)
    if (s === 1) {
      const stepErrors = {}
      if (allErrors.category) stepErrors.category = allErrors.category
      setErrors((prev) => ({ ...prev, ...stepErrors }))
      return Object.keys(stepErrors).length === 0
    }
    if (s === 2) {
      const stepErrors = {}
      if (allErrors.title) stepErrors.title = allErrors.title
      if (allErrors.description) stepErrors.description = allErrors.description
      if (allErrors.location_description) stepErrors.location_description = allErrors.location_description
      if (allErrors.photo) stepErrors.photo = allErrors.photo
      setErrors((prev) => ({ ...prev, ...stepErrors }))
      return Object.keys(stepErrors).length === 0
    }
    if (s === 3) {
      const stepErrors = {}
      if (allErrors.reporter_email) stepErrors.reporter_email = allErrors.reporter_email
      setErrors((prev) => ({ ...prev, ...stepErrors }))
      return Object.keys(stepErrors).length === 0
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 3))
  }
  const prevStep = () => { setErrors({}); setStep((s) => Math.max(s - 1, 1)) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const allErrors = validateReportForm(form)
    if (!isFormValid(allErrors)) {
      setErrors(allErrors)
      toast.error('Please fix the highlighted fields before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const res = await requestsApi.create(form)
      setSubmittedId(res.data?.id)
      setSubmitted(true)
      setAiPhase('analysing')
      toast.success('Report submitted successfully!', { title: 'Thank you!' })
      fireSubmissionNotifications(res.data?.id)
    } catch {
      // Backend offline — show a clear error rather than a fake success
      toast.error('Could not reach the server. Please check your connection and try again.', { title: 'Submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  // Phase 1 — AI analysis animation
  if (submitted && aiPhase === 'analysing') {
    return (
      <div className="section-container py-20">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-8 text-center animate-slide-up">
          {/* Pulsing brain icon */}
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
                border: '2px solid rgba(99,102,241,0.4)',
                boxShadow: '0 0 40px rgba(99,102,241,0.2)',
              }}
            >
              <BrainCircuit size={44} className="text-indigo-400" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(99,102,241,0.15)', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
            />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-100">AI is analysing your report…</h1>
            <p className="mt-2 text-slate-400 text-sm">The agentic system is processing your submission</p>
          </div>

          {/* Step list */}
          <div className="glass p-5 w-full text-left flex flex-col gap-3">
            {AI_STEPS.map((label, i) => {
              const done = aiStep > i
              const active = aiStep === i
              const visible = aiStep >= i
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm transition-all duration-500"
                  style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)' }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: done ? '#10b981' : active ? '#6366f1' : 'rgba(255,255,255,0.06)',
                      boxShadow: active ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={12} className="text-white" />
                      : <span className="w-1.5 h-1.5 rounded-full bg-white/60" style={active ? { animation: 'pulse 1s ease-in-out infinite' } : {}} />
                    }
                  </div>
                  <span
                    className="transition-colors duration-300"
                    style={{ color: done ? '#94a3b8' : active ? '#f1f5f9' : '#64748b', fontWeight: active ? 500 : 400 }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Phase 2 — success screen with AI result embedded
  if (submitted) {
    return (
      <div className="section-container py-20">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-8 text-center animate-slide-up">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))',
              border: '2px solid rgba(16,185,129,0.4)',
              boxShadow: '0 0 40px rgba(16,185,129,0.2)',
            }}
          >
            <CheckCircle2 size={44} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100">Report Submitted!</h1>
            <p className="mt-3 text-slate-400">
              Thank you for helping improve our community. Your report has been logged
              {submittedId ? ` as #${submittedId}` : ''} and will be reviewed shortly.
            </p>
          </div>

          {/* AI triage result card */}
          {aiResult && (
            <div
              className="glass p-5 w-full text-left animate-slide-up"
              style={{ border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={13} className="text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">AI Triage Result</span>
              </div>
              <div className="flex flex-wrap gap-5 mb-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Suggested Category</p>
                  <span
                    className="badge border text-xs px-2.5 py-1"
                    style={{ color: aiResult.cat.color, background: aiResult.cat.bgColor, borderColor: aiResult.cat.color + '40' }}
                  >
                    {aiResult.cat.label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Priority</p>
                  <span
                    className="badge border text-xs px-2.5 py-1"
                    style={{ color: aiResult.priority.color, background: aiResult.priority.bg, borderColor: aiResult.priority.color + '40' }}
                  >
                    {aiResult.priority.label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Confidence</p>
                  <span className="text-sm font-bold" style={{ color: aiResult.priority.color }}>{aiResult.confidence}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{aiResult.reasoning}</p>
            </div>
          )}

          {/* Notification opt-in — shown only if permission not yet granted */}
          {notifPermission === 'default' && (
            <button
              onClick={requestNotif}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <Bell size={15} className="text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">Get notified when a crew is assigned</p>
                <p className="text-xs text-slate-500 truncate">Tap to enable push notifications</p>
              </div>
              <span className="text-xs text-indigo-400 shrink-0 font-medium">Enable</span>
            </button>
          )}

          <div className="glass p-5 w-full text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Your submission</p>
            <div className="flex flex-col gap-2">
              <Row label="Title" value={form.title} />
              <Row label="Category" value={CATEGORIES.find(c => c.id === form.category)?.label} />
              <Row label="Location" value={form.location_description} />
              {form.reporter_name && <Row label="Submitted by" value={form.reporter_name} />}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate(`/track/${submittedId}`)}
              className="btn-primary flex-1 py-3"
            >
              Track My Report
            </button>
            <button
              onClick={() => {
                setForm(INITIAL_FORM)
                setErrors({})
                setPhotoPreviews([])
                setStep(1)
                setSubmitted(false)
                setAiPhase(null)
                setAiResult(null)
              }}
              className="btn-secondary flex-1 py-3"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedCat = CATEGORIES.find((c) => c.id === form.category)

  return (
    <div className="section-container py-10">
      <div className="max-w-2xl mx-auto">

        <div className="mb-10 animate-fade-in">
          <h1 className="text-3xl font-extrabold text-slate-100">Report an Issue</h1>
          <p className="mt-2 text-slate-400">
            Help your community by reporting a public facility issue. Anonymous reports are welcome.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-8 animate-fade-in">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => { if (step > s.id) { setErrors({}); setStep(s.id) } }}
                className="flex items-center gap-2 min-w-0"
                disabled={step <= s.id}
              >
                <span
                  className={`step-circle ${step > s.id ? 'done' : step === s.id ? 'active' : 'pending'}`}
                >
                  {step > s.id ? <CheckCircle2 size={16} /> : s.id}
                </span>
                <span
                  className={`text-xs font-medium hidden sm:block truncate ${
                    step === s.id ? 'text-slate-100' : step > s.id ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px"
                  style={{
                    background: step > s.id
                      ? 'linear-gradient(90deg, #10b981, #0077C8)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card form */}
        <div className="glass p-6 sm:p-8 animate-slide-up">
          <form
            onSubmit={handleSubmit}
            noValidate
            onKeyDown={(e) => {
              // Prevent Enter from submitting the form on steps 1 and 2 —
              // the user should only be able to submit explicitly on step 3.
              if (e.key === 'Enter' && step < 3) e.preventDefault()
            }}
          >

            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-1">
                  <Tag size={16} className="text-indigo-400" />
                  Select a Category
                  <span className="text-rose-400">*</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CATEGORIES.map((cat) => {
                    const Icon = ICON_MAP[cat.icon] || HelpCircle
                    const isSelected = form.category === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-card ${isSelected ? 'selected' : ''}`}
                        style={isSelected ? {
                          borderColor: cat.color,
                          background: cat.bgColor,
                          boxShadow: `0 0 20px ${cat.color}20`,
                        } : {}}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            category: cat.id,
                            title: '',
                            description: '',
                            location_description: '',
                            photos: [],
                          }))
                          setPhotoPreviews([])
                          setErrors((prev) => ({ ...prev, category: null }))
                        }}
                        aria-pressed={isSelected}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: isSelected ? cat.bgColor : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isSelected ? cat.color + '60' : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <Icon size={20} style={{ color: isSelected ? cat.color : '#94a3b8' }} />
                        </div>
                        <span
                          className="text-xs font-medium leading-tight"
                          style={{ color: isSelected ? cat.color : '#94a3b8' }}
                        >
                          {cat.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 size={14} className="absolute top-2 right-2" style={{ color: cat.color }} />
                        )}
                      </button>
                    )
                  })}
                </div>

                {errors.category && (
                  <p className="form-error">
                    <AlertCircle size={13} /> {errors.category}
                  </p>
                )}

                {selectedCat && (
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: selectedCat.bgColor,
                      border: `1px solid ${selectedCat.borderColor}`,
                      color: selectedCat.color,
                    }}
                  >
                    <Info size={15} />
                    <span>{selectedCat.description}</span>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-5">

                <div>
                  <label className="form-label">
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-400" />
                      Issue Title <span className="text-rose-400">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={set('title')}
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    placeholder="e.g. Broken streetlight on Main St near No. 42"
                    maxLength={200}
                    autoFocus
                  />
                  <div className="flex justify-between">
                    {errors.title
                      ? <p className="form-error"><AlertCircle size={13} />{errors.title}</p>
                      : <p className="form-hint">Be specific — include street names or landmarks</p>
                    }
                    <span className="form-hint ml-auto">{form.title.length}/200</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="form-label">
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-400" />
                      Description <span className="text-rose-400">*</span>
                    </span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={set('description')}
                    className={`form-input resize-none ${errors.description ? 'error' : ''}`}
                    placeholder="Describe the issue in detail — what is broken, how long it's been like this, any safety concerns…"
                    rows={5}
                    maxLength={500}
                  />
                  <div className="flex justify-between">
                    {errors.description
                      ? <p className="form-error"><AlertCircle size={13} />{errors.description}</p>
                      : <p className="form-hint">Minimum 20 characters</p>
                    }
                    <span className="form-hint ml-auto">{form.description.length}/500</span>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-indigo-400" />
                      Location <span className="text-rose-400">*</span>
                    </span>
                  </label>
                  {/* GPS button + text input sit side-by-side so the user can auto-fill
                      or type manually — whichever is faster for them. */}
                  <div className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={form.location_description}
                      onChange={set('location_description')}
                      className={`form-input flex-1 ${errors.location_description ? 'error' : ''}`}
                      placeholder="e.g. Corner of Queen St & Victoria St, Auckland CBD"
                      maxLength={300}
                    />
                    <button
                      type="button"
                      onClick={handleGpsClick}
                      disabled={gpsLoading}
                      className="btn-secondary px-3 py-2.5 shrink-0 gap-1.5 text-xs whitespace-nowrap"
                      title="Auto-fill location using GPS"
                    >
                      {gpsLoading
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Crosshair size={14} />
                      }
                      {gpsLoading ? 'Locating…' : 'Use GPS'}
                    </button>
                  </div>
                  {errors.location_description
                    ? <p className="form-error"><AlertCircle size={13} />{errors.location_description}</p>
                    : <p className="form-hint">Street address, landmark, or tap "Use GPS" to auto-detect your location</p>
                  }
                </div>

                <div>
                  <label className="form-label">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-indigo-400" />
                      Photos <span className="text-slate-500 font-normal">(optional · up to {MAX_PHOTOS})</span>
                    </span>
                  </label>

                  {/* Thumbnails grid — one card per added photo */}
                  {photoPreviews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                      {photoPreviews.map((item, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10 aspect-square">
                          <img
                            src={item.preview}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-red-500/90 flex items-center justify-center transition-colors"
                            aria-label={`Remove photo ${idx + 1}`}
                          >
                            <X size={10} className="text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5 text-[9px] text-white/70 truncate">
                            #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drop zone — hidden when MAX_PHOTOS reached */}
                  {photoPreviews.length < MAX_PHOTOS && (
                    <div
                      className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            addPhotos(e.target.files)
                            // Reset value immediately so the next pick always fires onChange,
                            // even if the user selects a file with the same name (common on
                            // mobile where camera saves are all called "image.jpg").
                            e.target.value = ''
                          }
                        }}
                      />
                      <div className="flex flex-col items-center gap-3 py-8 px-6 text-center">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.2)' }}
                        >
                          <Upload size={20} className="text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-300">
                            {photoPreviews.length === 0
                              ? <>Drop photos here, or <span className="text-indigo-400 underline underline-offset-2">browse</span></>
                              : <>Add more photos ({MAX_PHOTOS - photoPreviews.length} remaining)</>
                            }
                          </p>
                          <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP · Max 10 MB each</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {photoPreviews.length >= MAX_PHOTOS && (
                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Maximum {MAX_PHOTOS} photos added
                    </p>
                  )}

                  {errors.photo && (
                    <p className="form-error mt-2"><AlertCircle size={13} />{errors.photo}</p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div
                  className="flex items-start gap-3 p-4 rounded-xl text-sm"
                  style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)' }}
                >
                  <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 leading-relaxed">
                    Your contact details are <strong className="text-slate-100">completely optional</strong>.
                    You can submit anonymously. If you provide your email, we'll notify you
                    when your report is updated.
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    <span className="flex items-center gap-1.5">
                      <User size={14} className="text-indigo-400" />
                      Your Name <span className="text-slate-500 font-normal">(optional)</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.reporter_name}
                    onChange={set('reporter_name')}
                    className={`form-input ${errors.reporter_name ? 'error' : ''}`}
                    placeholder="Leave blank to submit anonymously"
                    maxLength={100}
                    autoFocus
                    autoComplete="name"
                  />
                  {errors.reporter_name && (
                    <p className="form-error"><AlertCircle size={13} />{errors.reporter_name}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} className="text-indigo-400" />
                      Email Address <span className="text-slate-500 font-normal">(optional)</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    value={form.reporter_email}
                    onChange={set('reporter_email')}
                    className={`form-input ${errors.reporter_email ? 'error' : ''}`}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {errors.reporter_email
                    ? <p className="form-error"><AlertCircle size={13} />{errors.reporter_email}</p>
                    : <p className="form-hint">We'll send you updates when your report status changes</p>
                  }
                </div>

                {/* Summary card */}
                <div className="border-t border-white/[0.06] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                    Review your report
                  </p>
                  <div className="glass-sm p-4 flex flex-col gap-2.5">
                    <Row label="Category" value={CATEGORIES.find(c => c.id === form.category)?.label} />
                    <Row label="Title" value={form.title} />
                    <Row label="Location" value={form.location_description} />
                    <Row label="Photos" value={form.photos.length > 0 ? `${form.photos.length} photo${form.photos.length > 1 ? 's' : ''}` : 'None'} />
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  By submitting this report, you agree that the information provided may be
                  shared with the relevant local authority to facilitate repairs. We handle
                  your data in accordance with New Zealand's Privacy Act 2020.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={prevStep}
                className={`btn-secondary px-5 py-2.5 text-sm ${step === 1 ? 'invisible' : ''}`}
              >
                Back
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                Step {step} of {STEPS.length}
              </div>

              {step < 3 ? (
                // key forces React to unmount this button (not reuse the DOM node)
                // when step reaches 3, preventing the leftover mouseup from the
                // Continue click from immediately firing on the Submit button.
                <button key={`continue-${step}`} type="button" onClick={nextStep} className="btn-primary px-6 py-2.5 text-sm gap-2">
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  key="submit"
                  type="submit"
                  className="btn-primary px-7 py-2.5 text-sm gap-2"
                  disabled={submitting}
                >
                  {submitting
                    ? <><LoadingSpinner size="sm" /> Submitting…</>
                    : <><CheckCircle2 size={16} /> Submit Report</>
                  }
                </button>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}

// Small helper row
function Row({ label, value }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-500 shrink-0 whitespace-nowrap">{label}</span>
      <span className="text-slate-200 font-medium truncate">{value || '—'}</span>
    </div>
  )
}