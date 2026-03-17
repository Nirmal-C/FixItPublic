import { useState, useCallback, useEffect, createContext, useContext } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
}

const STYLES = {
  success: { border: 'rgba(16,185,129,0.4)', icon: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  error: { border: 'rgba(239,68,68,0.4)', icon: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  warning: { border: 'rgba(245,158,11,0.4)', icon: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  info: { border: 'rgba(59,130,246,0.4)', icon: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const style = STYLES[toast.type] || STYLES.info

  useEffect(() => {
    // The 10ms delay gives the browser one paint cycle to render the element before
    // we flip `visible` to true — without it the CSS transition never fires because
    // the element starts and ends in the same state in the same frame.
    const t1 = setTimeout(() => setVisible(true), 10)
    const t2 = setTimeout(() => {
      setVisible(false)
      // Wait for the fade-out transition to finish before actually removing from DOM.
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 4500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className="toast glass-sm flex items-start gap-3 px-4 py-3.5 min-w-[300px] max-w-md"
      style={{
        background: style.bg,
        borderColor: style.border,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <span style={{ color: style.icon, flexShrink: 0, marginTop: 1 }}>
        {ICONS[toast.type]}
      </span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-slate-100 mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm text-slate-300 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
        className="btn-ghost p-1 -mr-1 -mt-0.5 shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((type, message, options = {}) => {
    // Math.random() on top of Date.now() handles the edge case where two toasts
    // are triggered in the same millisecond (e.g. from a rapid double-click).
    const id = Date.now() + Math.random()
    // Cap at 5 toasts — slice(-4) keeps the 4 most recent, then we append the new one.
    setToasts((prev) => [...prev.slice(-4), { id, type, message, ...options }])
  }, [])

  const toast = {
    success: (msg, opts) => add('success', msg, opts),
    error: (msg, opts) => add('error', msg, opts),
    warning: (msg, opts) => add('warning', msg, opts),
    info: (msg, opts) => add('info', msg, opts),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
