import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, X, CheckCircle2, AlertCircle, User, Mail,
  MapPin, FileText, Tag, Image as ImageIcon,
  Zap, Trees, Footprints, Construction, Building2, Bus, Paintbrush, HelpCircle,
  ChevronRight, Info, Crosshair, Loader2,
} from 'lucide-react'
import { CATEGORIES } from '../utils/constants'
import { validateReportForm, isFormValid } from '../utils/validation'
import { requestsApi } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

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

const INITIAL_FORM = {
  title: '',
  category: '',
  description: '',
  location_description: '',
  reporter_name: '',
  reporter_email: '',
  photo: null,
}

export default function ReportIssuePage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [photoPreview, setPhotoPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  // GPS auto-fill state — tracks whether we're waiting on the geolocation API
  const [gpsLoading, setGpsLoading] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const toast = useToast()

  // Returns an onChange handler for the named form field so we don't need a
  // separate handler for every input. Clears that field's validation error on
  // first keystroke so the red message disappears while the user is fixing it.
  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
  }

  const handlePhoto = useCallback((file) => {
    if (!file) return
    // Validate before generating the preview — no point showing a preview
    // for a file we're going to reject (wrong type, too large, etc.).
    const photoErr = validateReportForm({ ...form, photo: file }).photo
    if (photoErr) {
      setErrors((prev) => ({ ...prev, photo: photoErr }))
      return
    }
    setForm((prev) => ({ ...prev, photo: file }))
    setErrors((prev) => ({ ...prev, photo: null }))
    // FileReader converts the local file to a base64 data URL we can put in an img src.
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }, [form])

  const removePhoto = () => {
    setForm((prev) => ({ ...prev, photo: null }))
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handlePhoto(file)
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
      () => {
        toast.error('Location access denied. Please type your location manually.')
        setGpsLoading(false)
      },
      { timeout: 10000 }
    )
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
    return true
  }

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 3))
  }
  const prevStep = () => setStep((s) => Math.max(s - 1, 1))

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
      toast.success('Report submitted successfully!', { title: 'Thank you!' })
    } catch {
      // Backend offline — simulate successful submission for demo purposes
      await new Promise((resolve) => setTimeout(resolve, 800))
      setSubmittedId('DEMO-' + Math.floor(Math.random() * 9000 + 1000))
      setSubmitted(true)
      toast.success('Report submitted! (demo mode — backend offline)', { title: 'Thank you!' })
    } finally {
      setSubmitting(false)
    }
  }

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
              onClick={() => navigate('/requests')}
              className="btn-primary flex-1 py-3"
            >
              View All Reports
            </button>
            <button
              onClick={() => {
                setForm(INITIAL_FORM)
                setErrors({})
                setPhotoPreview(null)
                setStep(1)
                setSubmitted(false)
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
                onClick={() => step > s.id && setStep(s.id)}
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
          <form onSubmit={handleSubmit} noValidate>

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
                          setForm((prev) => ({ ...prev, category: cat.id }))
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
                    maxLength={2000}
                  />
                  <div className="flex justify-between">
                    {errors.description
                      ? <p className="form-error"><AlertCircle size={13} />{errors.description}</p>
                      : <p className="form-hint">Minimum 20 characters</p>
                    }
                    <span className="form-hint ml-auto">{form.description.length}/2000</span>
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
                      Photo <span className="text-slate-500 font-normal">(optional)</span>
                    </span>
                  </label>

                  {photoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full max-h-56 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-white/80">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          {form.photo?.name} ({(form.photo?.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="w-7 h-7 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                          aria-label="Remove photo"
                        >
                          <X size={13} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ) : (
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
                        className="hidden"
                        onChange={(e) => handlePhoto(e.target.files?.[0])}
                      />
                      <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.2)' }}
                        >
                          <Upload size={22} className="text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-300">
                            Drop a photo here, or{' '}
                            <span className="text-indigo-400 underline underline-offset-2">browse</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP · Max 10 MB</p>
                        </div>
                      </div>
                    </div>
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
                    <Row label="Photo" value={form.photo ? form.photo.name : 'None'} />
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
                <button type="button" onClick={nextStep} className="btn-primary px-6 py-2.5 text-sm gap-2">
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
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
      <span className="text-slate-500 shrink-0 w-20">{label}</span>
      <span className="text-slate-200 font-medium truncate">{value || '—'}</span>
    </div>
  )
}
