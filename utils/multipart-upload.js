/**
 * Multipart upload utilities for file shorts
 * Handles parallel chunk upload with progress tracking
 */

import { request } from 'undici'
import { Readable } from 'stream'

const MAX_CONCURRENT_UPLOADS = 3 // Reduced from 5 to avoid overwhelming connections
const MAX_RETRIES = 5 // Increased from 3 for better reliability
const RETRY_DELAY_MS = 1000
const BODY_TIMEOUT_MS = 120000 // 2 minutes for body upload
const HEADERS_TIMEOUT_MS = 30000 // 30 seconds for headers

/**
 * Upload a single part to S3 using presigned URL
 * @param {string} presignedUrl - Presigned URL for the part
 * @param {Buffer} data - Part data
 * @param {number} partNumber - Part number for error reporting
 * @returns {Promise<string>} ETag from the upload response
 */
async function uploadPart (presignedUrl, data, partNumber) {
  let lastError

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use Readable stream to avoid EPIPE issues with large buffers
      const bodyStream = Readable.from(data)

      const response = await request(presignedUrl, {
        method: 'PUT',
        body: bodyStream,
        headers: {
          'content-length': data.length
        },
        bodyTimeout: BODY_TIMEOUT_MS,
        headersTimeout: HEADERS_TIMEOUT_MS
      })

      if (response.statusCode !== 200) {
        const body = await response.body.text()
        throw new Error(`Upload failed with status ${response.statusCode}: ${body}`)
      }

      // Get ETag from response headers
      const etag = response.headers.etag
      if (!etag) {
        throw new Error('No ETag in response headers')
      }

      return etag
    } catch (error) {
      lastError = error

      // EPIPE errors need longer delays as they often indicate connection issues
      const isEpipe = error.code === 'EPIPE' || error.message?.includes('EPIPE')
      const baseDelay = isEpipe ? RETRY_DELAY_MS * 3 : RETRY_DELAY_MS

      if (attempt < MAX_RETRIES - 1) {
        const delay = baseDelay * (attempt + 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(`Failed to upload part ${partNumber} after ${MAX_RETRIES} attempts: ${lastError.message}`)
}

/**
 * Upload file parts in parallel with progress tracking
 * @param {Array<{partNumber: number, url: string}>} presignedUrls - Array of presigned URL objects
 * @param {Buffer} fileBuffer - Complete file buffer
 * @param {number} partSize - Size of each part in bytes
 * @param {Function} onProgress - Progress callback (completedParts, totalParts, completedBytes, totalBytes)
 * @returns {Promise<Array<{partNumber: number, etag: string}>>} Array of completed parts with ETags
 */
export async function uploadParts (presignedUrls, fileBuffer, partSize, onProgress) {
  const totalParts = presignedUrls.length
  const totalBytes = fileBuffer.length
  const completedParts = []
  let completedBytes = 0

  // Create array of upload tasks
  const uploadTasks = presignedUrls.map(({ partNumber, url }) => {
    const start = (partNumber - 1) * partSize
    const end = Math.min(start + partSize, fileBuffer.length)
    const partData = fileBuffer.subarray(start, end)

    return {
      partNumber,
      url,
      data: partData,
      size: partData.length
    }
  })

  // Process uploads in batches to limit concurrency
  const results = []
  const STAGGER_DELAY_MS = 100 // Small delay between starting concurrent uploads

  for (let i = 0; i < uploadTasks.length; i += MAX_CONCURRENT_UPLOADS) {
    const batch = uploadTasks.slice(i, i + MAX_CONCURRENT_UPLOADS)

    const batchResults = await Promise.all(
      batch.map(async (task, index) => {
        // Stagger start times to avoid overwhelming connection pool
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS * index))
        }

        const etag = await uploadPart(task.url, task.data, task.partNumber)

        completedBytes += task.size
        completedParts.push({ partNumber: task.partNumber, etag })

        if (onProgress) {
          onProgress(completedParts.length, totalParts, completedBytes, totalBytes)
        }

        return { partNumber: task.partNumber, etag }
      })
    )

    results.push(...batchResults)
  }

  // Sort by part number before returning
  return results.sort((a, b) => a.partNumber - b.partNumber)
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes (bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Create a progress bar string
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @param {number} width - Width of the bar in characters
 * @returns {string} Progress bar string
 */
export function createProgressBar (current, total, width = 30) {
  const percent = Math.min(100, Math.round((current / total) * 100))
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled

  return `[${'='.repeat(filled)}${' '.repeat(empty)}] ${percent}%`
}
