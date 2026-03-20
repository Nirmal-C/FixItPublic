import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Users, UserPlus, Trash2, RefreshCw, ShieldCheck,
  ShieldAlert, User, X, AlertCircle, CheckCircle2, Eye, EyeOff,
  Search, Edit2, Mail, Phone, KeyRound, ToggleLeft, ToggleRight,
  ChevronDown,
} from 'lucide-react'
import apiClient from '../../api/client'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useToast } from '../../components/Toast'

const A_ACCESS = 'pfmrs_access_token'
const adminHeaders = () => {
  const token = localStorage.getItem(A_ACCESS)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const ROLE_STYLES = {
  superuser: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Superuser', Icon: ShieldAlert },
  admin:     { color: '#0077C8', bg: 'rgba(0,119,200,0.12)',  label: 'Admin',     Icon: ShieldCheck },
  citizen:   { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Citizen',  Icon: User },
}

function formatDate(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'var(--text-primary)' }) {
  return (
    <div className="glass px-5 py-4 flex flex-col gap-1">
      <span className="text-2xl font-extrabold" style={{ color }}>{value}</span>
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ── Edit drawer ───────────────────────────────────────────────────────────────
function EditDrawer({ user: u, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    username: u.username,
    first_name: u.first_name || '',
    last_name:  u.last_name  || '',
    email:      u.email,
    phone:      u.phone || '',
    role:       u.role,
    is_active:  u.is_active,
    email_notifications: u.email_notifications,
    new_password: '',
  })
  const [errors,    setErrors]    = useState({})
  const [saving,    setSaving]    = useState(false)
  const [showPass,  setShowPass]  = useState(false)

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: val }))
    setErrors((prev) => ({ ...prev, [field]: null }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = { ...form }
      if (!payload.new_password) delete payload.new_password
      const res = await apiClient.patch(`/api/superuser/users/${u.id}/`, payload, { headers: adminHeaders() })
      toast.success('User updated', { title: form.username })
      onSaved(res.data)
    } catch (err) {
      const data = err?.response?.data || {}
      if (typeof data === 'object') setErrors(data)
      else toast.error(err?.userMessage || 'Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 9998 }}
        onClick={onClose}
        aria-label="Close"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md overflow-y-auto"
        style={{ zIndex: 9999, background: 'var(--surface)', borderLeft: '1px solid var(--divider)' }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div>
            <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Edit User</div>
            <div className="text-xs text-slate-400 mt-0.5">{u.username}</div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-5">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">First name</label>
              <input value={form.first_name} onChange={set('first_name')} className="form-input" placeholder="First" />
            </div>
            <div>
              <label className="form-label">Last name</label>
              <input value={form.last_name} onChange={set('last_name')} className="form-input" placeholder="Last" />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="form-label">Username <span className="text-rose-400">*</span></label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={form.username} onChange={set('username')}
                className={`form-input pl-8 ${errors.username ? 'error' : ''}`}
                placeholder="username" autoComplete="off"
              />
            </div>
            {errors.username && <p className="form-error"><AlertCircle size={12} />{errors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email <span className="text-rose-400">*</span></label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="email" value={form.email} onChange={set('email')}
                className={`form-input pl-8 ${errors.email ? 'error' : ''}`}
                placeholder="user@example.com"
              />
            </div>
            {errors.email && <p className="form-error"><AlertCircle size={12} />{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="form-label">Phone</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={form.phone} onChange={set('phone')}
                className="form-input pl-8" placeholder="+64 9 000 0000"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="form-label">Role <span className="text-rose-400">*</span></label>
            <div className="relative">
              <select value={form.role} onChange={set('role')} className="form-input pr-8 appearance-none">
                <option value="citizen">Citizen</option>
                <option value="admin">Admin</option>
                <option value="superuser">Superuser</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3">
            <Toggle
              label="Account Active"
              description="Inactive users cannot log in"
              on={form.is_active}
              onToggle={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
            />
            <Toggle
              label="Email Notifications"
              description="Receive status-update emails"
              on={form.email_notifications}
              onToggle={() => setForm((p) => ({ ...p, email_notifications: !p.email_notifications }))}
            />
          </div>

          {/* Password reset */}
          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
            <label className="form-label flex items-center gap-1.5">
              <KeyRound size={13} className="text-indigo-400" />
              New Password <span className="text-slate-500 font-normal">(leave blank to keep unchanged)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.new_password} onChange={set('new_password')}
                className={`form-input pr-10 ${errors.new_password ? 'error' : ''}`}
                placeholder="min 8 characters"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="btn-ghost absolute right-2 top-1/2 -translate-y-1/2 p-1">
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {errors.new_password && <p className="form-error"><AlertCircle size={12} />{errors.new_password}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button type="submit" className="btn-primary flex-1 text-sm gap-2" disabled={saving}>
              {saving ? 'Saving…' : <><CheckCircle2 size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}

function Toggle({ label, description, on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-colors"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--divider)' }}
    >
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <div
        className="w-9 h-5 rounded-full flex items-center shrink-0 transition-colors duration-200"
        style={{ background: on ? '#6366f1' : 'rgba(255,255,255,0.12)', padding: 2 }}
      >
        <div
          className="w-4 h-4 rounded-full bg-white transition-transform duration-200"
          style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </div>
    </button>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({ user: u, onCancel, onConfirm, deleting }) {
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative glass p-6 rounded-2xl w-full max-w-sm flex flex-col gap-4" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <Trash2 size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Delete User</div>
            <div className="text-xs text-slate-400">This action cannot be undone.</div>
          </div>
        </div>
        <p className="text-sm text-slate-300">
          Are you sure you want to permanently delete <strong className="text-slate-100">{u.username}</strong>?
          All their data will be removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 text-sm px-4 py-2.5 rounded-lg font-medium text-white transition-opacity"
            style={{ background: '#ef4444', opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search,   setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const { user: me } = useAdminAuth()
  const toast = useToast()

  // Create form
  const [form,       setForm]       = useState({ username: '', email: '', password: '', password2: '', phone: '', role: 'admin' })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showPass,   setShowPass]   = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/api/superuser/users/', { headers: adminHeaders() })
      setUsers(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch {
      toast.error('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Filtered list
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase()
      const matchSearch = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchRole   = !roleFilter || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [users, search, roleFilter])

  // Stats
  const stats = useMemo(() => ({
    total:      users.length,
    superusers: users.filter((u) => u.role === 'superuser').length,
    admins:     users.filter((u) => u.role === 'admin').length,
    citizens:   users.filter((u) => u.role === 'citizen').length,
    active:     users.filter((u) => u.is_active).length,
    inactive:   users.filter((u) => !u.is_active).length,
  }), [users])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormErrors({})
    setSubmitting(true)
    try {
      await apiClient.post('/api/superuser/users/create/', form, { headers: adminHeaders() })
      toast.success(`${form.role} account created`, { title: form.username })
      setForm({ username: '', email: '', password: '', password2: '', phone: '', role: 'admin' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      const data = err?.response?.data || {}
      if (typeof data === 'object') setFormErrors(data)
      else toast.error(err?.userMessage || 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaved = (updated) => {
    setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u))
    setEditUser(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient.delete(`/api/superuser/users/${deleteTarget.id}/`, { headers: adminHeaders() })
      setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      toast.success(`${deleteTarget.username} deleted`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err?.userMessage || 'Failed to delete user.')
    } finally {
      setDeleting(false)
    }
  }

  const setF = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setFormErrors((prev) => ({ ...prev, [field]: null }))
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Superuser access only</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="btn-ghost flex items-center gap-1.5 text-sm" disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-1.5 text-sm">
            <UserPlus size={14} /> New User
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Superusers" value={stats.superusers} color="#f59e0b" />
        <StatCard label="Admins" value={stats.admins} color="#0077C8" />
        <StatCard label="Citizens" value={stats.citizens} color="#64748b" />
        <StatCard label="Active" value={stats.active} color="#10b981" />
        <StatCard label="Inactive" value={stats.inactive} color="#ef4444" />
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Create Admin / Superuser</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Username <span className="text-rose-400">*</span></label>
              <input type="text" value={form.username} onChange={setF('username')} className={`form-input ${formErrors.username ? 'error' : ''}`} placeholder="username" autoComplete="off" />
              {formErrors.username && <p className="form-error"><AlertCircle size={12} />{formErrors.username}</p>}
            </div>
            <div>
              <label className="form-label">Email <span className="text-rose-400">*</span></label>
              <input type="email" value={form.email} onChange={setF('email')} className={`form-input ${formErrors.email ? 'error' : ''}`} placeholder="user@example.com" />
              {formErrors.email && <p className="form-error"><AlertCircle size={12} />{formErrors.email}</p>}
            </div>
            <div>
              <label className="form-label">Password <span className="text-rose-400">*</span></label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={setF('password')} className={`form-input pr-10 ${formErrors.password ? 'error' : ''}`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="btn-ghost absolute right-2 top-1/2 -translate-y-1/2 p-1">
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {formErrors.password && <p className="form-error"><AlertCircle size={12} />{formErrors.password}</p>}
            </div>
            <div>
              <label className="form-label">Confirm Password <span className="text-rose-400">*</span></label>
              <input type={showPass ? 'text' : 'password'} value={form.password2} onChange={setF('password2')} className={`form-input ${formErrors.password2 ? 'error' : ''}`} placeholder="••••••••" />
              {formErrors.password2 && <p className="form-error"><AlertCircle size={12} />{formErrors.password2}</p>}
            </div>
            <div>
              <label className="form-label">Phone <span className="text-slate-500 font-normal">(optional)</span></label>
              <input type="text" value={form.phone} onChange={setF('phone')} className="form-input" placeholder="+64 9 000 0000" />
            </div>
            <div>
              <label className="form-label">Role <span className="text-rose-400">*</span></label>
              <select value={form.role} onChange={setF('role')} className="form-input">
                <option value="admin">Admin</option>
                <option value="superuser">Superuser</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" className="btn-primary text-sm gap-2" disabled={submitting}>
                {submitting ? 'Creating…' : <><CheckCircle2 size={14} /> Create User</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email…"
            className="form-input pl-9 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost absolute right-2 top-1/2 -translate-y-1/2 p-1">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-input pr-8 appearance-none min-w-36"
          >
            <option value="">All roles</option>
            <option value="superuser">Superuser</option>
            <option value="admin">Admin</option>
            <option value="citizen">Citizen</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="text-xs text-slate-500 self-center whitespace-nowrap">
          {filtered.length} of {users.length} users
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                {['User', 'Email / Phone', 'Role', 'Status', 'Tickets', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--divider)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    {search || roleFilter ? 'No users match your filters.' : 'No users found.'}
                  </td>
                </tr>
              ) : filtered.map((u) => {
                const rs = ROLE_STYLES[u.role] || ROLE_STYLES.citizen
                const RoleIcon = rs.Icon
                const isSelf = u.id === me?.user_id
                return (
                  <tr
                    key={u.id}
                    className="group transition-colors"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: rs.bg }}>
                          <RoleIcon size={14} style={{ color: rs.color }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {u.username} {isSelf && <span className="text-xs text-slate-500">(you)</span>}
                          </div>
                          {(u.first_name || u.last_name) && (
                            <div className="text-xs text-slate-500">{[u.first_name, u.last_name].filter(Boolean).join(' ')}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email / phone */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-300">{u.email}</div>
                      {u.phone && <div className="text-xs text-slate-500 mt-0.5">{u.phone}</div>}
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3">
                      <span className="badge border text-xs px-2.5 py-1 whitespace-nowrap" style={{ color: rs.color, background: rs.bg, borderColor: rs.color + '40' }}>
                        {rs.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className="badge border text-xs px-2.5 py-1"
                        style={{
                          color:       u.is_active ? '#10b981' : '#ef4444',
                          background:  u.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          borderColor: u.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                        }}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Ticket count */}
                    <td className="px-4 py-3 text-sm text-slate-400">{u.ticket_count ?? '—'}</td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(u.date_joined)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditUser(u)}
                          className="btn-ghost p-1.5 text-slate-400 hover:text-indigo-400 transition-colors"
                          title="Edit user"
                        >
                          <Edit2 size={14} />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="btn-ghost p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit drawer */}
      {editUser && (
        <EditDrawer
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  )
}
