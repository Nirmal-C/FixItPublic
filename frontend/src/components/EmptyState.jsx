import { Link } from 'react-router-dom'

export default function EmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description = '',
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-5">
      {Icon && (
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(102,126,234,0.08)',
            border: '1px solid rgba(102,126,234,0.2)',
          }}
        >
          <Icon size={36} className="text-indigo-400 opacity-70" />
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
        {description && (
          <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
        )}
      </div>
      {action && (
        <Link to={action.to} className="btn-primary text-sm px-5 py-2.5">
          {action.label}
        </Link>
      )}
    </div>
  )
}
