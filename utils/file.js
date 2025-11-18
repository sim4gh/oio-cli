import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

const MAX_NOTE_SIZE_BYTES = 400 * 1024 // 400KB

/**
 * Read a file and validate its size
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} File content
 * @throws {Error} If file doesn't exist or is too large
 */
export async function readNoteFile(filePath) {
  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  // Read file content
  const content = await readFile(filePath, 'utf8')

  // Validate size
  const sizeBytes = Buffer.byteLength(content, 'utf8')
  if (sizeBytes > MAX_NOTE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / 1024).toFixed(2)
    throw new Error(
      `Note content exceeds maximum size of 400KB (current: ${sizeMB}KB). Please reduce the file size.`
    )
  }

  return content
}

/**
 * Validate note content size
 * @param {string} content - Note content
 * @returns {boolean} True if valid
 * @throws {Error} If content is too large
 */
export function validateNoteSize(content) {
  const sizeBytes = Buffer.byteLength(content, 'utf8')
  if (sizeBytes > MAX_NOTE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / 1024).toFixed(2)
    throw new Error(
      `Note content exceeds maximum size of 400KB (current: ${sizeMB}KB). Please reduce the content size.`
    )
  }
  return true
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 KB", "2.3 MB")
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
