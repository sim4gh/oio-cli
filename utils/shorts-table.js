/**
 * Table formatting utilities for oio shorts
 * Handles display of shorts in tabular format
 */

import Table from 'cli-table3'
import { formatExpiry } from './ttl.js'
import { truncate } from './shorts-validator.js'

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
function formatBytes (bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Format shorts list as a table
 * @param {Array} shorts - Array of short objects
 * @returns {string} Formatted table
 */
export function formatShortsTable(shorts) {
  if (!shorts || shorts.length === 0) {
    return 'No shorts found.'
  }

  const table = new Table({
    head: ['ID', 'Type', 'Content / Filename', 'Expires'],
    colWidths: [10, 8, 52, 12],
    wordWrap: true,
    wrapOnWordBoundary: true
  })

  shorts.forEach(short => {
    const shortId = short.shortId || short.id || 'N/A'
    const expiresAt = short.expiresAt || 0
    const isFile = short.type === 'file'

    let typeIndicator
    let contentDisplay

    if (isFile) {
      typeIndicator = '[F]'
      const sizeStr = short.fileSize ? ` (${formatBytes(short.fileSize)})` : ''
      contentDisplay = truncate(short.filename || 'Unknown', 40) + sizeStr
    } else {
      typeIndicator = '[T]'
      contentDisplay = truncate(short.contentPreview || short.content || '', 49)
    }

    table.push([
      shortId,
      typeIndicator,
      contentDisplay,
      formatExpiry(expiresAt)
    ])
  })

  return table.toString()
}

/**
 * Format a single short details as a table
 * @param {Object} short - Short object
 * @returns {string} Formatted table
 */
export function formatShortDetails(short) {
  if (!short) {
    return 'No short data available.'
  }

  const table = new Table({
    colWidths: [20, 80],
    wordWrap: true,
    wrapOnWordBoundary: true
  })

  table.push(
    ['ID', short.shortId || short.id || 'N/A'],
    ['Created', short.createdAt ? new Date(short.createdAt * 1000).toISOString() : 'N/A'],
    ['Expires', short.expiresAt ? formatExpiry(short.expiresAt) : 'N/A'],
    ['Expires At', short.expiresAt ? new Date(short.expiresAt * 1000).toISOString() : 'N/A'],
    ['Content Length', short.content ? `${short.content.length} chars` : 'N/A']
  )

  return table.toString()
}

/**
 * Format shorts list in compact mode (one per line)
 * @param {Array} shorts - Array of short objects
 * @returns {string} Formatted list
 */
export function formatShortsCompact(shorts) {
  if (!shorts || shorts.length === 0) {
    return 'No shorts found.'
  }

  return shorts.map(short => {
    const shortId = short.shortId || short.id || 'N/A'
    const preview = truncate(short.contentPreview || short.content || '', 80)
    const expiry = formatExpiry(short.expiresAt || 0)
    return `${shortId} | ${preview} | ${expiry}`
  }).join('\n')
}
