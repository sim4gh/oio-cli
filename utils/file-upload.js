import { stat } from 'fs/promises'
import { existsSync } from 'fs'
import { basename } from 'path'
import mime from 'mime-types'
import { uploadAttachment } from './attachment-api.js'
import ora from 'ora'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/x-zip-compressed'
]

/**
 * Validate a file for upload
 * @param {string} filePath - Path to the file
 * @returns {Promise<object>} Object with fileName, fileSize, mimeType
 * @throws {Error} If file is invalid
 */
export async function validateFile(filePath) {
  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  // Get file stats
  const stats = await stat(filePath)

  // Check if it's a file (not directory)
  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${filePath}`)
  }

  // Check file size
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    throw new Error(
      `File exceeds maximum size of 10MB (current: ${sizeMB}MB). Please reduce the file size.`
    )
  }

  // Get MIME type
  const fileName = basename(filePath)
  const mimeType = mime.lookup(filePath)

  if (!mimeType) {
    throw new Error(`Unable to determine file type for: ${fileName}`)
  }

  // Check if MIME type is allowed
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `File type not allowed: ${mimeType}. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, text, markdown, JSON, ZIP.`
    )
  }

  return {
    fileName,
    fileSize: stats.size,
    mimeType
  }
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 KB", "2.3 MB")
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Upload multiple files as attachments to a note
 * @param {string} noteId - Note ID
 * @param {Array<string>} filePaths - Array of file paths to upload
 * @returns {Promise<Array>} Array of upload results
 */
export async function uploadFiles(noteId, filePaths) {
  const results = []

  for (const filePath of filePaths) {
    const spinner = ora(`Validating ${basename(filePath)}...`).start()

    try {
      // Validate file
      const { fileName, fileSize, mimeType } = await validateFile(filePath)
      spinner.text = `Uploading ${fileName} (${formatFileSize(fileSize)})...`

      // Upload file
      const response = await uploadAttachment(noteId, filePath, fileName)

      if (response.statusCode === 201) {
        spinner.succeed(`Uploaded ${fileName}`)
        results.push({
          success: true,
          fileName,
          attachmentId: response.body.attachmentId
        })
      } else {
        spinner.fail(`Failed to upload ${fileName}`)
        results.push({
          success: false,
          fileName,
          error: response.body.message || 'Unknown error'
        })
      }
    } catch (error) {
      spinner.fail(`Failed to upload ${basename(filePath)}`)
      results.push({
        success: false,
        fileName: basename(filePath),
        error: error.message
      })
    }
  }

  return results
}

/**
 * Parse comma-separated file paths from command option
 * @param {string} attachOption - Comma-separated file paths
 * @returns {Array<string>} Array of file paths
 */
export function parseAttachmentPaths(attachOption) {
  if (!attachOption) return []

  return attachOption
    .split(',')
    .map(path => path.trim())
    .filter(path => path.length > 0)
}
