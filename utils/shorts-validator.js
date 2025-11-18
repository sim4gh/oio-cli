/**
 * Validation utilities for oio shorts
 * Handles content size validation and text formatting
 */

const MAX_SHORT_SIZE_BYTES = 360 * 1024 // 360KB (90% of DynamoDB 400KB limit)

/**
 * Validate short content size
 * @param {string} content - Short content to validate
 * @returns {boolean} True if valid
 * @throws {Error} If content exceeds max size
 */
export function validateShortSize(content) {
  if (!content) {
    throw new Error('Content cannot be empty')
  }

  if (typeof content !== 'string') {
    throw new Error('Content must be a string')
  }

  const sizeBytes = Buffer.byteLength(content, 'utf8')
  if (sizeBytes > MAX_SHORT_SIZE_BYTES) {
    const sizeKB = (sizeBytes / 1024).toFixed(2)
    const maxKB = (MAX_SHORT_SIZE_BYTES / 1024).toFixed(0)
    throw new Error(
      `Content exceeds maximum size of ${maxKB}KB (current: ${sizeKB}KB)`
    )
  }
  return true
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, length) {
  if (!text) return ''
  if (typeof text !== 'string') return String(text)
  if (text.length <= length) return text
  return text.substring(0, length - 3) + '...'
}

/**
 * Get content size in bytes
 * @param {string} content - Content to measure
 * @returns {number} Size in bytes
 */
export function getContentSize(content) {
  if (!content) return 0
  return Buffer.byteLength(content, 'utf8')
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 KB", "360 KB")
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Get maximum allowed short size
 * @returns {number} Maximum size in bytes
 */
export function getMaxShortSize() {
  return MAX_SHORT_SIZE_BYTES
}
