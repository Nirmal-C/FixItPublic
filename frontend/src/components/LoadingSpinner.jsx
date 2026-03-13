export default function LoadingSpinner({ size = 'md', label = 'Loading…', center = false }) {
  const dim = { sm: 20, md: 32, lg: 48 }[size] || 32
  const stroke = { sm: 2, md: 2.5, lg: 3 }[size] || 2.5

  const spinner = (
    <div
      className="flex flex-col items-center gap-3"
      role="status"
      aria-label={label}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 32 32"
        fill="none"
        className="animate-spin"
        style={{ animationDuration: '0.8s' }}
      >
        <circle
          cx="16" cy="16" r="13"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <path
          d="M16 3 A13 13 0 0 1 29 16"
          stroke="url(#spinner-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="spinner-grad" x1="16" y1="3" x2="29" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#667eea" />
            <stop offset="1" stopColor="#764ba2" />
          </linearGradient>
        </defs>
      </svg>
      {size !== 'sm' && (
        <p className="text-sm text-slate-400 animate-pulse">{label}</p>
      )}
    </div>
  )

  if (center) {
    return (
      <div className="flex items-center justify-center py-20">
        {spinner}
      </div>
    )
  }

  return spinner
}
