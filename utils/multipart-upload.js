/**
 * Multipart upload utilities for file shorts
 * Handles parallel chunk upload with progress tracking
 */

import { request } from 'undici'
import { Readable } from 'stream'
import { open } from 'fs/promises'

const MAX_CONCURRENT_UPLOADS = 2 // Reduced to avoid connection issues with large files
const MAX_RETRIES = 8 // More retries for large file uploads
const RETRY_DELAY_MS = 2000
const BODY_TIMEOUT_MS = 300000 // 5 minutes for body upload (large parts need more time)
const HEADERS_TIMEOUT_MS = 60000 // 1 minute for headers

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

      // Connection errors need longer delays
      const isConnectionError = error.code === 'EPIPE' ||
                                error.code === 'ECONNRESET' ||
                                error.code === 'ETIMEDOUT' ||
                                error.message?.includes('EPIPE') ||
                                error.message?.includes('ECONNRESET')
      const baseDelay = isConnectionError ? RETRY_DELAY_MS * 3 : RETRY_DELAY_MS

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
 * Upload file parts by streaming from file (for large files > 2GB)
 * @param {Array<{partNumber: number, url: string}>} presignedUrls - Array of presigned URL objects
 * @param {string} filePath - Path to the file
 * @param {number} fileSize - Total file size in bytes
 * @param {number} partSize - Size of each part in bytes
 * @param {Function} onProgress - Progress callback (completedParts, totalParts, completedBytes, totalBytes)
 * @returns {Promise<Array<{partNumber: number, etag: string}>>} Array of completed parts with ETags
 */
export async function uploadPartsFromFile (presignedUrls, filePath, fileSize, partSize, onProgress) {
  const totalParts = presignedUrls.length
  const completedParts = []
  let completedBytes = 0

  // Open file handle for reading
  const fileHandle = await open(filePath, 'r')

  try {
    // Process uploads in batches to limit concurrency
    for (let i = 0; i < presignedUrls.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = presignedUrls.slice(i, i + MAX_CONCURRENT_UPLOADS)

      await Promise.all(
        batch.map(async ({ partNumber, url }, index) => {
          // Stagger start times
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 100 * index))
          }

          // Calculate part boundaries
          const start = (partNumber - 1) * partSize
          const end = Math.min(start + partSize, fileSize)
          const chunkSize = end - start

          // Read chunk from file
          const buffer = Buffer.alloc(chunkSize)
          await fileHandle.read(buffer, 0, chunkSize, start)

          // Upload the chunk
          const etag = await uploadPart(url, buffer, partNumber)

          completedBytes += chunkSize
          completedParts.push({ partNumber, etag })

          if (onProgress) {
            onProgress(completedParts.length, totalParts, completedBytes, fileSize)
          }
        })
      )
    }
  } finally {
    await fileHandle.close()
  }

  // Sort by part number before returning
  return completedParts.sort((a, b) => a.partNumber - b.partNumber)
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
