export default function SkeletonCard() {
  return (
    <div className="glass p-5 flex flex-col gap-4 animate-pulse">
      {/* Image placeholder */}
      <div className="skeleton w-full h-36 rounded-xl" />

      <div className="flex flex-col gap-3">
        {/* Badges row */}
        <div className="flex gap-2">
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        {/* Title */}
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        {/* Description */}
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-5/6 rounded" />
        {/* Meta */}
        <div className="pt-2 border-t border-white/[0.06] flex gap-4">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
    </div>
  )
}
