import { useState, useEffect, useCallback } from 'react'
import {
  Users, UserPlus, Trash2, RefreshCw, ShieldCheck,
  ShieldAlert, User, X, AlertCircle, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'
import apiClient from '../../api/client'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useToast } from '../../components/Toast'

// Always use the admin token for superuser API calls regardless of citizen session
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

export default function UsersPage() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [deleting,   setDeleting]   = useState(null)
  const { user: me } = useAdminAuth()
  const toast = useToast()

  // Create form state
  const [form,        setForm]        = useState({ username: '', email: '', password: '', password2: '', phone: '', role: 'admin' })
  const [formErrors,  setFormErrors]  = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [showPass,    setShowPass]    = useState(false)

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

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiClient.patch(`/api/superuser/users/${userId}/`, { role: newRole }, { headers: adminHeaders() })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
      toast.success(`Role updated to ${newRole}`)
    } catch (err) {
      toast.error(err?.userMessage || 'Failed to update role.')
    }
  }

  const handleToggleActive = async (u) => {
    try {
      await apiClient.patch(`/api/superuser/users/${u.id}/`, { is_active: !u.is_active }, { headers: adminHeaders() })
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
      toast.success(`${u.username} ${!u.is_active ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err?.userMessage || 'Failed to update user.')
    }
  }

  const handleDelete = async (u) => {
    setDeleting(u.id)
    try {
      await apiClient.delete(`/api/superuser/users/${u.id}/`, { headers: adminHeaders() })
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      toast.success(`${u.username} deleted`)
    } catch (err) {
      toast.error(err?.userMessage || 'Failed to delete user.')
    } finally {
      setDeleting(null)
    }
  }

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setFormErrors((prev) => ({ ...prev, [field]: null }))
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            User Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Superuser access only</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="btn-ghost flex items-center gap-1.5 text-sm" disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-1.5 text-sm">
            <UserPlus size={14} />
            New User
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Create Admin / Superuser</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="form-label">Username <span className="text-rose-400">*</span></label>
              <input type="text" value={form.username} onChange={set('username')} className={`form-input ${formErrors.username ? 'error' : ''}`} placeholder="username" autoComplete="off" />
              {formErrors.username && <p className="form-error"><AlertCircle size={12} />{formErrors.username}</p>}
            </div>
            {/* Email */}
            <div>
              <label className="form-label">Email <span className="text-rose-400">*</span></label>
              <input type="email" value={form.email} onChange={set('email')} className={`form-input ${formErrors.email ? 'error' : ''}`} placeholder="user@example.com" />
              {formErrors.email && <p className="form-error"><AlertCircle size={12} />{formErrors.email}</p>}
            </div>
            {/* Password */}
            <div>
              <label className="form-label">Password <span className="text-rose-400">*</span></label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} className={`form-input pr-10 ${formErrors.password ? 'error' : ''}`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="btn-ghost absolute right-2 top-1/2 -translate-y-1/2 p-1">
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {formErrors.password && <p className="form-error"><AlertCircle size={12} />{formErrors.password}</p>}
            </div>
            {/* Confirm password */}
            <div>
              <label className="form-label">Confirm Password <span className="text-rose-400">*</span></label>
              <input type={showPass ? 'text' : 'password'} value={form.password2} onChange={set('password2')} className={`form-input ${formErrors.password2 ? 'error' : ''}`} placeholder="••••••••" />
              {formErrors.password2 && <p className="form-error"><AlertCircle size={12} />{formErrors.password2}</p>}
            </div>
            {/* Phone */}
            <div>
              <label className="form-label">Phone <span className="text-slate-500 font-normal">(optional)</span></label>
              <input type="text" value={form.phone} onChange={set('phone')} className="form-input" placeholder="+64 9 000 0000" />
            </div>
            {/* Role */}
            <div>
              <label className="form-label">Role <span className="text-rose-400">*</span></label>
              <select value={form.role} onChange={set('role')} className="form-input">
                <option value="admin">Admin</option>
                <option value="superuser">Superuser</option>
              </select>
            </div>
            {/* Submit */}
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" className="btn-primary text-sm gap-2" disabled={submitting}>
                {submitting ? 'Creating…' : <><CheckCircle2 size={14} /> Create User</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--divider)' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-4 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : users.map((u) => {
                const rs = ROLE_STYLES[u.role] || ROLE_STYLES.citizen
                const RoleIcon = rs.Icon
                const isSelf = u.id === me?.user_id
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                    {/* User */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: rs.bg }}>
                          <RoleIcon size={13} style={{ color: rs.color }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {u.username} {isSelf && <span className="text-xs text-slate-500">(you)</span>}
                        </span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-3 text-xs text-slate-400">{u.email}</td>
                    {/* Role */}
                    <td className="px-5 py-3">
                      {isSelf ? (
                        <span className="badge border text-xs" style={{ color: rs.color, background: rs.bg, borderColor: rs.color + '40' }}>
                          {rs.label}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="form-input text-xs py-1 px-2 w-32"
                        >
                          <option value="citizen">Citizen</option>
                          <option value="admin">Admin</option>
                          <option value="superuser">Superuser</option>
                        </select>
                      )}
                    </td>
                    {/* Active */}
                    <td className="px-5 py-3">
                      <button
                        onClick={() => !isSelf && handleToggleActive(u)}
                        disabled={isSelf}
                        className={`badge border text-xs ${isSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                        style={{
                          color:       u.is_active ? '#10b981' : '#ef4444',
                          background:  u.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          borderColor: u.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                        }}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    {/* Joined */}
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(u.date_joined)}</td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      {!isSelf && (
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={deleting === u.id}
                          className="btn-ghost p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}