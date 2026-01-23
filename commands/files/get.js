import { apiRequest, handleApiError } from '../../utils/api.js'
import { request } from 'undici'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { join } from 'path'
import ora from 'ora'
import clipboard from 'clipboardy'

/**
 * Format file size to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes (bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Get file command
 * Downloads a file from Files storage
 * @param {string} fileId - File ID to download
 * @param {object} options - Command options
 */
export async function getFile (fileId, options) {
  const spinner = ora('Getting file info...').start()

  try {
    const response = await apiRequest(`/files/${fileId}`)

    if (response.statusCode === 403) {
      spinner.fail('Pro subscription required')
      console.error('\nError: The Files feature requires a Pro subscription.')
      process.exit(1)
    }

    if (response.statusCode === 404) {
      spinner.fail('File not found')
      console.error(`\nError: File with ID "${fileId}" not found.`)
      process.exit(1)
    }

    if (response.statusCode !== 200) {
      spinner.fail('Failed to get file')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    const file = response.body

    // If just getting info (no download)
    if (options.info) {
      spinner.stop()
      console.log(`File ID: ${file.fileId}`)
      console.log(`Filename: ${file.filename}`)
      console.log(`Size: ${formatBytes(file.size)}`)
      console.log(`Type: ${file.contentType}`)
      if (file.description) {
        console.log(`Description: ${file.description}`)
      }
      console.log(`Created: ${new Date(file.createdAt).toLocaleString()}`)
      console.log(`Updated: ${new Date(file.updatedAt).toLocaleString()}`)
      console.log(`\nDownload URL (expires in ${Math.floor(file.downloadUrlExpiresIn / 60)} minutes):`)
      console.log(file.downloadUrl)

      // Copy download URL to clipboard
      try {
        await clipboard.write(file.downloadUrl)
        console.log(`\n(Download URL copied to clipboard)`)
      } catch {
        // Clipboard may not be available
      }
      return
    }

    // Download the file
    spinner.text = `Downloading ${file.filename}...`

    // Determine output path
    let outputPath
    if (options.output) {
      outputPath = options.output
    } else {
      outputPath = join(process.cwd(), file.filename)
    }

    // Download file using presigned URL
    const downloadResponse = await request(file.downloadUrl, {
      method: 'GET'
    })

    if (downloadResponse.statusCode !== 200) {
      spinner.fail('Download failed')
      console.error(`Error: Failed to download file (status ${downloadResponse.statusCode})`)
      process.exit(1)
    }

    // Write to file
    const writeStream = createWriteStream(outputPath)
    await pipeline(downloadResponse.body, writeStream)

    spinner.succeed(`Downloaded: ${outputPath}`)
    console.log(`\nFile: ${file.filename}`)
    console.log(`Size: ${formatBytes(file.size)}`)
  } catch (error) {
    spinner.stop()
    handleApiError(error)
  }
}
