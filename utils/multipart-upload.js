/**
 * Multipart upload utilities for file shorts
 * Handles parallel chunk upload with progress tracking
 */

import { request } from 'undici'

const MAX_CONCURRENT_UPLOADS = 5
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

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
      const response = await request(presignedUrl, {
        method: 'PUT',
        body: data,
        headers: {
          'content-length': data.length
        }
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
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
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

  for (let i = 0; i < uploadTasks.length; i += MAX_CONCURRENT_UPLOADS) {
    const batch = uploadTasks.slice(i, i + MAX_CONCURRENT_UPLOADS)

    const batchResults = await Promise.all(
      batch.map(async task => {
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
