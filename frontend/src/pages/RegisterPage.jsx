import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, AlertCircle, CheckCircle2, Loader2, Building2, Eye, EyeOff } from 'lucide-react'
import { useCitizenAuth } from '../contexts/CitizenAuthContext'
import { useToast } from '../components/Toast'

function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const color = score === 3 ? '#10b981' : score === 2 ? '#f59e0b' : '#ef4444'
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? color : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map(({ label, ok }) => (
          <span key={label} className="flex items-center gap-1 text-[10px]" style={{ color: ok ? '#10b981' : 'var(--text-muted)' }}>
            <CheckCircle2 size={10} style={{ opacity: ok ? 1 : 0.3 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState({})
  const [globalError, setGlobalError] = useState('')

  const { register } = useCitizenAuth()
  const navigate     = useNavigate()
  const toast        = useToast()

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setErrors((p) => ({ ...p, [field]: null }))
    setGlobalError('')
  }

  const validate = () => {
    const e = {}
    if (!form.username.trim())          e.username = 'Username is required.'
    else if (form.username.length < 3)  e.username = 'Username must be at least 3 characters.'
    else if (!/^[\w.@+-]+$/.test(form.username)) e.username = 'Username may only contain letters, numbers, and @/./+/-/_'
    if (!form.email.trim())             e.email    = 'Email address is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address.'
    if (!form.password)                 e.password = 'Password is required.'
    else if (form.password.length < 8)  e.password = 'Password must be at least 8 characters.'
    if (!form.confirm)                  e.confirm  = 'Please confirm your password.'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await register({
        username:   form.username.trim(),
        email:      form.email.trim(),
        password:   form.password,
        first_name: form.first_name.trim(),
      })
      toast.success('Account created successfully!', { title: 'Welcome!' })
      navigate('/', { replace: true })
    } catch (err) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        // Map Django field errors back to our form fields
        const mapped = {}
        if (data.username)   mapped.username = data.username[0]
        if (data.email)      mapped.email    = data.email[0]
        if (data.password)   mapped.password = data.password[0]
        if (Object.keys(mapped).length) { setErrors(mapped); return }
      }
      setGlobalError(err?.userMessage || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ id, label, icon: Icon, error, children }) => (
    <div>
      <label htmlFor={id} className="form-label">
        <Icon size={13} className="inline mr-1.5 text-indigo-400" />
        {label}
      </label>
      {children}
      {error && (
        <p className="form-error mt-1"><AlertCircle size={12} /> {error}</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md animate-slide-up">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFC72C' }}>
              <Building2 size={20} style={{ color: '#002040' }} />
            </div>
            <div>
              <span className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>FixIt</span>
              <span className="text-lg font-extrabold" style={{ color: '#FFC72C' }}>Public</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="glass p-8 flex flex-col gap-5">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Create an account</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Track your reports and receive status notifications
            </p>
          </div>

          {globalError && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              <AlertCircle size={15} className="shrink-0" />
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

            <Field id="first_name" label="First Name (optional)" icon={User} error={errors.first_name}>
              <input
                id="first_name"
                type="text"
                value={form.first_name}
                onChange={set('first_name')}
                className="form-input"
                placeholder="e.g. Aroha"
                autoComplete="given-name"
              />
            </Field>

            <Field id="username" label="Username" icon={User} error={errors.username}>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={set('username')}
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="e.g. aroha_w"
                autoComplete="username"
              />
            </Field>

            <Field id="email" label="Email Address" icon={Mail} error={errors.email}>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={set('email')}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>

            <div>
              <label htmlFor="password" className="form-label">
                <Lock size={13} className="inline mr-1.5 text-indigo-400" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password
                ? <p className="form-error mt-1"><AlertCircle size={12} /> {errors.password}</p>
                : <PasswordStrength password={form.password} />
              }
            </div>

            <div>
              <label htmlFor="confirm" className="form-label">
                <Lock size={13} className="inline mr-1.5 text-indigo-400" />
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  className={`form-input pr-10 ${errors.confirm ? 'error' : ''}`}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirm && <p className="form-error mt-1"><AlertCircle size={12} /> {errors.confirm}</p>}
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              By creating an account, you agree to our terms and the New Zealand Privacy Act 2020. Your data is used solely to manage and track maintenance reports.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <div className="text-center text-sm" style={{ borderTop: '1px solid var(--divider)', paddingTop: '1.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
