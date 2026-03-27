/**
 * authUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared JWT utility functions used by both CitizenAuthContext and
 * AdminAuthContext.
 *
 * Extracting these into a module eliminates the duplication that
 * previously existed — identical decodePayload() and isTokenExpired()
 * functions were copy-pasted into both context files.  A single source
 * of truth means a bug fix or algorithm change applies everywhere at once.
 *
 * OOP concepts demonstrated
 * ──────────────────────────
 * Encapsulation   — token-handling logic is isolated here; contexts
 *                   import what they need and don't care how it works.
 * Abstraction     — callers receive a boolean or object; they never
 *                   deal with base64 decoding or epoch arithmetic.
 * DRY principle   — single implementation used by all auth contexts.
 */

// ── Token decoding ───────────────────────────────────────────────────────────

/**
 * Decode the payload section of a JWT without verifying the signature.
 *
 * Signature verification happens server-side.  Client-side decoding is
 * used only to read non-sensitive claims (role, user id, expiry) so the
 * UI can make routing decisions without an extra round-trip.
 *
 * @param {string} token  A compact JWT string (header.payload.signature).
 * @returns {object|null} The decoded payload object, or null on any error.
 */
export function decodePayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// ── Token expiry ─────────────────────────────────────────────────────────────

/**
 * Determine whether a decoded JWT payload has expired.
 *
 * A 30-second buffer is applied to account for clock skew between the
 * client device and the server that issued the token.
 *
 * @param {object|null} payload  The decoded JWT payload from decodePayload().
 * @returns {boolean}            True if the token is expired or invalid.
 */
export function isTokenExpired(payload) {
  if (!payload?.exp) return true
  return Date.now() / 1000 > payload.exp - 30
}

// ── Storage helpers ──────────────────────────────────────────────────────────

/**
 * Load a user object from localStorage by reading and decoding a stored
 * access token.  Returns null if no token exists, the token is malformed,
 * or the token has expired (stale tokens are cleaned up automatically).
 *
 * Optionally merges a persisted profile-override object so that UI state
 * such as toggled email notifications or an uploaded avatar URL survives
 * page refreshes without reissuing the JWT.
 *
 * @param {string}      accessKey   The localStorage key for the access token.
 * @param {string|null} [profileKey] Optional localStorage key for profile overrides.
 * @returns {object|null}
 */
export function loadStoredUser(accessKey, profileKey = null) {
  const token = localStorage.getItem(accessKey)
  if (!token) return null

  const payload = decodePayload(token)
  if (!payload || isTokenExpired(payload)) {
    localStorage.removeItem(accessKey)
    return null
  }

  if (!profileKey) return payload

  try {
    const overrides = JSON.parse(localStorage.getItem(profileKey) || 'null') || {}
    return { ...payload, ...overrides }
  } catch {
    return payload
  }
}

/**
 * Remove one or more localStorage keys in a single call.
 *
 * Used by logout handlers to clear all auth-related keys atomically
 * without repeating localStorage.removeItem() for each key.
 *
 * @param {...string} keys  Any number of localStorage key strings.
 */
export function clearAuthTokens(...keys) {
  keys.forEach((k) => localStorage.removeItem(k))
}
