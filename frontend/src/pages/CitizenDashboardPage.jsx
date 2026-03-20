import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Calendar, Bell, BellOff,
  FileText, Clock, Wrench, CheckCircle2,
  ChevronRight, Camera, Eye, EyeOff, Save, Lock, Pencil,
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

function PasswordStrength({ pw }) {
  const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw)]
  const score = checks.filter(Boolean).length
  const colors = ['#ef4444', '#f59e0b', '#10b981']
  const labels = ['Weak', 'Fair', 'Strong']
  if (!pw) return null
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors duration-200"
            style={{ background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <span className="text-xs" style={{ color: colors[score - 1] || 'var(--text-muted)' }}>
        {labels[score - 1] || ''}
      </span>
    </div>
  )
}

export default function CitizenDashboardPage() {
  const { user, isAuthenticated, updateProfile, cacheAvatar } = useCitizenAuth()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)

  const [tickets, setTickets]       = useState([])
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)

  // Profile edit
  const [editMode, setEditMode]     = useState(false)
  const [editForm, setEditForm]     = useState({})
  const [editError, setEditError]   = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState('')

  // Avatar
  const [avatarPreview,  setAvatarPreview]  = useState(null)
  const [avatarSaving,   setAvatarSaving]   = useState(false)
  // Blob URL created by fetching /api/auth/avatar/ with auth header.
  // Never expires (local object URL). Refreshed after each upload.
  const [avatarBlobUrl,  setAvatarBlobUrl]  = useState(null)

  // Password change
  const [pwSection, setPwSection]   = useState(false)
  const [pwForm, setPwForm]         = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwError, setPwError]       = useState('')
  const [pwSuccess, setPwSuccess]   = useState('')
  const [pwSaving, setPwSaving]     = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    // Use allSettled so a failing tickets request doesn't prevent the profile from loading
    Promise.allSettled([
      requestsApi.mine({ page_size: 100, ordering: '-created_at' }),
      authApi.profile(),
    ]).then(([ticketsResult, profileResult]) => {
      if (ticketsResult.status === 'fulfilled') {
        setTickets(ticketsResult.value.data?.results || [])
      }
      if (profileResult.status === 'fulfilled') {
        const profileData = profileResult.value.data
        setProfile(profileData)
        if (profileData.avatar_url) {
          cacheAvatar(profileData.avatar_url)
        }
        setEditForm({
          first_name: profileData.first_name || '',
          last_name:  profileData.last_name  || '',
          username:   profileData.username   || '',
          email:      profileData.email      || '',
          phone:      profileData.phone      || '',
        })
      }
    }).finally(() => setLoading(false))
  }, [isAuthenticated, navigate])

  // Fetch avatar via the authenticated proxy endpoint so we never depend on
  // a time-limited SAS URL in the browser. Re-runs whenever the user uploads
  // a new photo (avatarSaving toggles false → triggers re-fetch via key change).
  useEffect(() => {
    if (!isAuthenticated) return
    let objectUrl = null
    authApi.avatarBlob()
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data)
        setAvatarBlobUrl(objectUrl)
      })
      .catch(() => setAvatarBlobUrl(null))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [isAuthenticated, avatarSaving]) // re-fetch after every upload completes

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
      // Use context updateProfile so the change is persisted to localStorage
      // and user state is updated (survives refresh)
      await updateProfile({ email_notifications: !profile.email_notifications })
      setProfile((p) => p ? { ...p, email_notifications: !p.email_notifications } : p)
    } finally {
      setNotifSaving(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setEditError('Please upload a JPG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditError('Avatar must be smaller than 5 MB.')
      return
    }
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarSaving(true)
    setEditError('')
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await authApi.uploadAvatar(form)
      setProfile((p) => ({ ...p, avatar_url: res.data.avatar_url }))
      if (res.data.avatar_url) cacheAvatar(res.data.avatar_url)
      // avatarSaving flips false → re-triggers the blob-fetch useEffect
      setEditSuccess('Profile photo updated.')
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to upload avatar.')
      setAvatarPreview(null)
    } finally {
      setAvatarSaving(false)
    }
  }

  const validateProfileForm = () => {
    if (!editForm.username.trim() || editForm.username.trim().length < 3)
      return 'Username must be at least 3 characters.'
    if (!/^[\w.+\-@]+$/.test(editForm.username))
      return 'Username may only contain letters, numbers, and @/./+/-/_'
    if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email))
      return 'Please enter a valid email address.'
    return ''
  }

  const handleProfileSave = async () => {
    const err = validateProfileForm()
    if (err) { setEditError(err); return }
    setEditSaving(true)
    setEditError('')
    setEditSuccess('')
    try {
      // updateProfile persists changes to localStorage + user context (1 API call)
      const res = await updateProfile(editForm)
      // Merge — don't overwrite avatar_url with null if backend had a storage hiccup
      setProfile((prev) => ({ ...prev, ...res.data, avatar_url: res.data.avatar_url || prev?.avatar_url }))
      if (res.data.avatar_url) cacheAvatar(res.data.avatar_url)
      setEditMode(false)
      setEditSuccess('Profile updated successfully.')
    } catch (err) {
      const data = err.response?.data || {}
      const msg = data.email?.[0] || data.username?.[0] || data.detail || 'Failed to save changes.'
      setEditError(msg)
    } finally {
      setEditSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPwError('')
    setPwSuccess('')
    if (!pwForm.current_password) { setPwError('Current password is required.'); return }
    if (pwForm.new_password.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match.'); return }
    setPwSaving(true)
    try {
      await authApi.changePassword(pwForm)
      setPwSuccess('Password changed successfully.')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setPwSection(false)
    } catch (err) {
      setPwError(err.response?.data?.detail || 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  // avatarPreview: local blob after file-pick (instant feedback before upload finishes)
  // avatarBlobUrl: fetched via authenticated proxy, never expires
  const avatarUrl = avatarPreview || avatarBlobUrl || null
  const initials  = (profile?.username || '?')[0].toUpperCase()

  if (loading) return <div className="section-container py-20 flex justify-center"><LoadingSpinner /></div>

  return (
    <div className="section-container py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Track your reports and manage your profile.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
            <div key={key} className="glass p-4 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats[key]}</div>
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
                <Link to="/report" className="mt-3 inline-block text-xs text-indigo-400 hover:text-indigo-300">
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Profile</h2>
              {!editMode && (
                <button
                  onClick={() => { setEditMode(true); setEditError(''); setEditSuccess('') }}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>

            {/* Success / error banners */}
            {editSuccess && (
              <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">{editSuccess}</p>
            )}
            {editError && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{editError}</p>
            )}

            {profile && (
              <div className="flex flex-col gap-4">

                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-2"
                        style={{ borderColor: 'var(--divider)' }}
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                      >
                        {initials}
                      </div>
                    )}
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarSaving}
                      className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: '#6366f1' }}
                      title="Change photo"
                    >
                      {avatarSaving
                        ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        : <Camera size={12} className="text-white" />
                      }
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Click camera to change photo
                  </p>
                </div>

                {editMode ? (
                  /* ── Edit form ── */
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>First name</label>
                        <input
                          className="input w-full text-sm py-1.5 px-2"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                          placeholder="First"
                        />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Last name</label>
                        <input
                          className="input w-full text-sm py-1.5 px-2"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                          placeholder="Last"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Username *</label>
                      <input
                        className="input w-full text-sm py-1.5 px-2"
                        value={editForm.username}
                        onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Email *</label>
                      <input
                        type="email"
                        className="input w-full text-sm py-1.5 px-2"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Phone</label>
                      <input
                        className="input w-full text-sm py-1.5 px-2"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+64 ..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleProfileSave}
                        disabled={editSaving}
                        className="btn btn-primary flex-1 flex items-center justify-center gap-1 text-sm py-2"
                      >
                        {editSaving
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <><Save size={13} /> Save</>
                        }
                      </button>
                      <button
                        onClick={() => { setEditMode(false); setEditError('') }}
                        className="btn flex-1 text-sm py-2"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read-only view ── */
                  <div className="flex flex-col gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-2">
                      <User size={12} className="shrink-0" />
                      <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                        {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username}
                      </span>
                    </div>
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
                )}

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
                    style={{ background: profile.email_notifications ? '#6366f1' : 'rgba(255,255,255,0.15)' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                      style={{ transform: profile.email_notifications ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                {/* Change password section */}
                <button
                  onClick={() => { setPwSection((v) => !v); setPwError(''); setPwSuccess('') }}
                  className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <Lock size={12} />
                  {pwSection ? 'Cancel password change' : 'Change password'}
                </button>

                {pwSection && (
                  <div className="flex flex-col gap-3">
                    {pwError   && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{pwError}</p>}
                    {pwSuccess && <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">{pwSuccess}</p>}

                    {[
                      { label: 'Current password', key: 'current_password', show: showCurrent, setShow: setShowCurrent },
                      { label: 'New password',     key: 'new_password',     show: showNew,     setShow: setShowNew },
                      { label: 'Confirm password', key: 'confirm_password', show: showConfirm, setShow: setShowConfirm },
                    ].map(({ label, key, show, setShow }) => (
                      <div key={key}>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
                        <div className="relative">
                          <input
                            type={show ? 'text' : 'password'}
                            className="input w-full text-sm py-1.5 px-2 pr-8"
                            value={pwForm[key]}
                            onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            style={{ color: 'var(--text-muted)' }}
                            onClick={() => setShow((v) => !v)}
                          >
                            {show ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        </div>
                        {key === 'new_password' && <PasswordStrength pw={pwForm.new_password} />}
                      </div>
                    ))}

                    <button
                      onClick={handlePasswordChange}
                      disabled={pwSaving}
                      className="btn btn-primary flex items-center justify-center gap-1 text-sm py-2"
                    >
                      {pwSaving
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Save size={13} /> Update password</>
                      }
                    </button>
                  </div>
                )}

                <Link to="/report" className="btn btn-primary text-center text-sm py-2">
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
