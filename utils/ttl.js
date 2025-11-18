/**
 * TTL (Time To Live) utility functions for oio shorts
 * Handles parsing, validation, and formatting of TTL strings
 */

/**
 * Parse TTL string to seconds
 * @param {string} ttlString - e.g., "30s", "60m", "24h"
 * @returns {number} seconds
 * @throws {Error} If TTL format is invalid
 */
export function parseTTL(ttlString) {
  if (!ttlString || typeof ttlString !== 'string') {
    throw new Error('Invalid TTL format. Use: 30s, 60m, or 24h')
  }

  const match = ttlString.trim().match(/^(\d+)([smh])$/)
  if (!match) {
    throw new Error('Invalid TTL format. Use: 30s, 60m, or 24h')
  }

  const [, value, unit] = match
  const num = parseInt(value, 10)

  // Validate positive number
  if (num <= 0) {
    throw new Error('TTL value must be greater than 0')
  }

  // Validate reasonable limits
  switch (unit) {
    case 's':
      if (num > 31536000) { // 1 year in seconds
        throw new Error('TTL in seconds cannot exceed 1 year (31536000s)')
      }
      return num
    case 'm':
      if (num > 525600) { // 1 year in minutes
        throw new Error('TTL in minutes cannot exceed 1 year (525600m)')
      }
      return num * 60
    case 'h':
      if (num > 8760) { // 1 year in hours
        throw new Error('TTL in hours cannot exceed 1 year (8760h)')
      }
      return num * 3600
    default:
      throw new Error('Invalid unit. Use s (seconds), m (minutes), or h (hours)')
  }
}

/**
 * Format expiry timestamp to human-readable relative time
 * @param {number} expiresAt - Unix timestamp in seconds
 * @returns {string} e.g., "23h", "45m", "expired"
 */
export function formatExpiry(expiresAt) {
  if (!expiresAt || typeof expiresAt !== 'number') {
    return 'unknown'
  }

  const now = Math.floor(Date.now() / 1000)
  const remaining = expiresAt - now

  if (remaining < 0) return 'expired'
  if (remaining < 60) return `${remaining}s`
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`
  return `${Math.floor(remaining / 86400)}d`
}

/**
 * Validate TTL string format
 * @param {string} ttlString - TTL string to validate
 * @returns {boolean} True if valid format
 */
export function isValidTTL(ttlString) {
  if (!ttlString || typeof ttlString !== 'string') {
    return false
  }
  return /^\d+[smh]$/.test(ttlString.trim())
}

/**
 * Convert seconds to human-readable TTL format
 * @param {number} seconds - Number of seconds
 * @returns {string} e.g., "30s", "60m", "24h"
 */
export function secondsToTTL(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}
