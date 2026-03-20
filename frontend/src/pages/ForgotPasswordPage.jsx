import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { authApi } from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const validate = () => {
    if (!email.trim()) return 'Email address is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() })
      setSent(true)
    } catch {
      setSent(true) // Always show success to prevent email enumeration
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
              <Mail size={22} style={{ color: '#818cf8' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Forgot your password?
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-4">
                <p className="text-sm text-emerald-400 font-medium">Reset link sent!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  If an account with that email exists, you'll receive a reset link shortly.
                  Check your spam folder if you don't see it.
                </p>
              </div>
              <Link to="/login" className="btn btn-primary text-sm py-2.5 text-center">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Mail size={14} className="inline mr-1.5 mb-0.5" style={{ color: '#818cf8' }} />
                  Email address
                </label>
                <input
                  type="email"
                  className="input w-full"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Send reset link'
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
