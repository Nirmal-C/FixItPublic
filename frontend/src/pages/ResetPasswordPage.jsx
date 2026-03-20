import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { authApi } from '../api/client'

function PasswordStrength({ pw }) {
  const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw)]
  const score = checks.filter(Boolean).length
  const colors = ['#ef4444', '#f59e0b', '#10b981']
  const labels = ['Weak', 'Fair', 'Strong']
  if (!pw) return null
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-200"
            style={{ background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <span className="text-xs" style={{ color: colors[score - 1] || 'var(--text-muted)' }}>
        {labels[score - 1] || ''}
      </span>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const uid   = searchParams.get('uid')   || ''
  const token = searchParams.get('token') || ''

  const [form, setForm]       = useState({ new_password: '', confirm_password: '' })
  const [showNew, setShowNew]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass p-8 rounded-2xl text-center max-w-sm w-full flex flex-col gap-4">
          <p className="text-red-400 font-medium">Invalid or missing reset link.</p>
          <Link to="/forgot-password" className="btn btn-primary text-sm py-2.5">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const validate = () => {
    if (form.new_password.length < 8) return 'Password must be at least 8 characters.'
    if (form.new_password !== form.confirm_password) return 'Passwords do not match.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword({ uid, token, ...form })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass p-8 rounded-2xl flex flex-col gap-6">

          {/* Header */}
          <div className="text-center flex flex-col gap-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <Lock size={22} style={{ color: '#818cf8' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Set a new password
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Choose a strong password for your account.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-4">
                <p className="text-sm text-emerald-400 font-medium">Password reset successfully!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Redirecting you to sign in...
                </p>
              </div>
              <Link to="/login" className="btn btn-primary text-sm py-2.5 text-center">
                Sign In now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="input w-full pr-10"
                    placeholder="At least 8 characters"
                    value={form.new_password}
                    onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength pw={form.new_password} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="input w-full pr-10"
                    placeholder="Repeat your password"
                    value={form.confirm_password}
                    onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirm_password && form.new_password !== form.confirm_password && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Reset password'
                }
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
