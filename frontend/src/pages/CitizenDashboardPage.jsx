import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Calendar, Bell, BellOff,
  FileText, Clock, Wrench, CheckCircle2, XCircle,
  ChevronRight, RefreshCw,
} from 'lucide-react'
import { useCitizenAuth } from '../contexts/CitizenAuthContext'
import { requestsApi, authApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { CATEGORY_MAP } from '../utils/constants'

function formatDate(str) {
  if (!str) return '—'
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(str))
}

const STAT_CARDS = [
  { key: 'total',       label: 'My Reports',  icon: FileText,     color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  { key: 'pending',     label: 'Pending',      icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { key: 'in_progress', label: 'In Progress',  icon: Wrench,       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { key: 'resolved',    label: 'Resolved',     icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
]

export default function CitizenDashboardPage() {
  const { citizen, isAuthenticated, updateProfile } = useCitizenAuth()
  const navigate = useNavigate()

  const [tickets, setTickets]       = useState([])
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    Promise.all([
      requestsApi.mine({ page_size: 100, ordering: '-created_at' }),
      authApi.profile(),
    ])
      .then(([ticketsRes, profileRes]) => {
        setTickets(ticketsRes.data?.results || [])
        setProfile(profileRes.data)
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, navigate])

  const stats = {
    total:       tickets.length,
    pending:     tickets.filter((t) => t.status === 'pending').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved:    tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
  }

  const handleNotifToggle = async () => {
    if (!profile) return
    setNotifSaving(true)
    try {
      const res = await authApi.updateProfile({ email_notifications: !profile.email_notifications })
      setProfile(res.data)
    } finally {
      setNotifSaving(false)
    }
  }

  if (loading) return <div className="section-container py-20 flex justify-center"><LoadingSpinner /></div>

  return (
    <div className="section-container py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            My Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Track your reports and manage your profile.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
            <div
              key={key}
              className="glass p-4 flex flex-col gap-2"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats[key]}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent tickets */}
          <div className="lg:col-span-2 glass p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Reports</h2>
              <Link to="/requests" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>

            {tickets.length === 0 ? (
              <div className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No reports yet.</p>
                <Link
                  to="/report"
                  className="mt-3 inline-block text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Submit your first report &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col divide-y" style={{ borderColor: 'var(--divider)' }}>
                {tickets.slice(0, 5).map((t) => {
                  const cat = CATEGORY_MAP[t.category] || { label: t.category }
                  return (
                    <Link
                      key={t.id}
                      to={`/track/${t.id}`}
                      className="py-3 flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          #{t.id} {t.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {cat.label} · {formatDate(t.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={t.status} size="sm" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Profile panel */}
          <div className="glass p-5 flex flex-col gap-5">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Profile</h2>

            {profile && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                  >
                    {(profile.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {profile.username}
                    </p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{profile.role}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="shrink-0" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="shrink-0" />
                    <span>Joined {formatDate(profile.date_joined)}</span>
                  </div>
                </div>

                {/* Email notifications toggle */}
                <div
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--divider)' }}
                >
                  <div className="flex items-center gap-2">
                    {profile.email_notifications
                      ? <Bell size={14} className="text-indigo-400" />
                      : <BellOff size={14} style={{ color: 'var(--text-muted)' }} />
                    }
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Email updates</span>
                  </div>
                  <button
                    onClick={handleNotifToggle}
                    disabled={notifSaving}
                    className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                    style={{
                      background: profile.email_notifications ? '#6366f1' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                      style={{ transform: profile.email_notifications ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                <Link
                  to="/report"
                  className="btn btn-primary text-center text-sm py-2"
                >
                  Report an Issue
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
