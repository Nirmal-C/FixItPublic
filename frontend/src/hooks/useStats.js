/**
 * useStats.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hooks for dashboard statistics endpoints.
 *
 * Two named hooks are exported:
 *
 *   usePublicStats()  — fetches GET /api/stats/ (no auth required).
 *                       Used by the public HomePage to show live system stats.
 *
 *   useAdminStats()   — fetches GET /api/admin/stats/ (council admin+).
 *                       Used by the admin dashboard for the detailed breakdown.
 *
 * Both follow the same shape: { stats, loading, error }.  This consistency
 * means page components can be refactored to use either hook without
 * changing how they consume the result.
 *
 * OOP concepts demonstrated
 * ──────────────────────────
 * Abstraction     — callers never know which endpoint was called or how
 *                   the response was transformed.
 * Encapsulation   — the isMounted cancellation guard prevents setState
 *                   calls on unmounted components; callers are unaware.
 * Polymorphism    — both hooks share an identical return shape, so a
 *                   component can be swapped between them without changes.
 *
 * @example
 *   const { stats, loading } = usePublicStats()
 *   const { stats, loading } = useAdminStats()
 */

import { useState, useEffect } from 'react'
import { statsApi } from '../api/client'

/**
 * @typedef {Object} UseStatsResult
 * @property {object|null} stats    The stats payload, or null before load.
 * @property {boolean}     loading  True while the request is in-flight.
 * @property {string|null} error    User-facing error message, or null.
 */

/**
 * Fetch public system statistics.
 * Cached server-side by @cache_response(300) — subsequent calls within
 * 5 minutes will be served instantly with X-Cache: HIT.
 *
 * @returns {UseStatsResult}
 */
export function usePublicStats() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let mounted = true

    statsApi.public()
      .then((res) => { if (mounted) setStats(res.data) })
      .catch((err) => { if (mounted) setError(err.userMessage ?? 'Failed to load stats.') })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { stats, loading, error }
}

/**
 * Fetch admin-only statistics breakdown.
 * Requires the requesting user to have council admin or superuser role.
 * Returns HTTP 403 for citizen accounts — the error will surface in .error.
 *
 * @returns {UseStatsResult}
 */
export function useAdminStats() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let mounted = true

    statsApi.admin()
      .then((res) => { if (mounted) setStats(res.data) })
      .catch((err) => { if (mounted) setError(err.userMessage ?? 'Failed to load admin stats.') })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { stats, loading, error }
}
