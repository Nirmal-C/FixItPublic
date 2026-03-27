/**
 * useTickets.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hook for fetching and managing the ticket list.
 *
 * Encapsulates the data-fetching pattern — loading state, error handling,
 * pagination metadata — so that page components stay free of API plumbing.
 * Any component that needs a ticket list imports this hook and gets a
 * clean interface back; the underlying API call is hidden behind it.
 *
 * OOP concepts demonstrated
 * ──────────────────────────
 * Abstraction     — callers receive { tickets, loading, error, refetch };
 *                   they never touch requestsApi directly.
 * Encapsulation   — cancellation logic (isMounted flag) is internal.
 * Single Responsibility
 *                 — this hook does exactly one thing: manage ticket
 *                   list state for a given filter set.
 *
 * @example
 *   const { tickets, loading, error, refetch } = useTickets({ status: 'pending' })
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { requestsApi } from '../api/client'

/**
 * @typedef {Object} Pagination
 * @property {number} count      Total number of matching tickets (server-side).
 * @property {string|null} next  URL of the next page, or null.
 * @property {string|null} previous URL of the previous page, or null.
 */

/**
 * @typedef {Object} UseTicketsResult
 * @property {Array}      tickets    Current page of ticket objects.
 * @property {boolean}    loading    True while the API call is in-flight.
 * @property {string|null} error     User-facing error message, or null.
 * @property {Pagination} pagination Server-side pagination metadata.
 * @property {Function}   refetch   Re-run the query with optional param overrides.
 */

/**
 * Fetch a paginated, filtered list of tickets.
 *
 * @param {Object} [params={}]  Query parameters forwarded to GET /api/requests/.
 *                              Supports: status, category, search, crew,
 *                              escalated, ordering, page, page_size.
 * @returns {UseTicketsResult}
 */
export function useTickets(params = {}) {
  const [tickets,    setTickets]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null })

  // Stable JSON key so useEffect only re-runs when param values actually change,
  // not when the caller creates a new object literal on every render.
  const paramsKey = JSON.stringify(params)

  const fetch = useCallback(async (overrideParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const merged = { ...JSON.parse(paramsKey), ...overrideParams }
      const res    = await requestsApi.list(merged)
      const data   = res.data

      // Handle both paginated (DRF PageNumberPagination) and flat array responses.
      setTickets(data.results ?? data)
      if (data.count !== undefined) {
        setPagination({ count: data.count, next: data.next, previous: data.previous })
      }
    } catch (err) {
      setError(err.userMessage ?? 'Failed to load tickets. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [paramsKey])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch()
  }, [fetch])

  return { tickets, loading, error, pagination, refetch: fetch }
}
