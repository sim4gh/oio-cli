import { apiRequest, handleApiError } from '../../utils/api.js'
import { formatExpiry } from '../../utils/ttl.js'
import ora from 'ora'
import clipboard from 'clipboardy'

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
 * Get short command
 * Retrieves and displays a specific short
 * @param {string} shortId - Short ID
 */
export async function getShort(shortId) {
  try {
    const spinner = ora('Fetching short...').start()

    const response = await apiRequest(`/shorts/${shortId}`)

    if (response.statusCode === 200) {
      spinner.succeed('Short fetched successfully')

      const { type, content, createdAt, expiresAt, filename, fileSize, contentType, downloadUrl, downloadUrlExpiresIn } = response.body

      console.log('\n' + '='.repeat(60))
      console.log(`Short ID: ${shortId}`)
      console.log(`Type: ${type === 'file' ? 'File' : 'Text'}`)
      console.log(`Created: ${createdAt || 'N/A'}`)
      console.log(`Expires: ${expiresAt ? formatExpiry(expiresAt) : 'N/A'}`)
      console.log(`Expires At: ${expiresAt ? new Date(expiresAt * 1000).toISOString() : 'N/A'}`)
      console.log('='.repeat(60))

      if (type === 'file') {
        // Display file information
        console.log()
        console.log(`Filename: ${filename}`)
        console.log(`Size: ${formatBytes(fileSize)}`)
        console.log(`Content-Type: ${contentType}`)
        console.log()
        console.log('Download URL (valid for 1 hour):')
        console.log(downloadUrl)
        console.log()

        // Copy download URL to clipboard
        try {
          await clipboard.write(downloadUrl)
          console.log('(Download URL copied to clipboard)')
        } catch {
          // Clipboard may not be available in all environments
        }
      } else {
        // Display text content
        console.log()
        console.log(content)
        console.log()
      }
    } else if (response.statusCode === 404) {
      spinner.fail('Short not found')
      console.error(`Error: No short found with ID ${shortId}`)
      console.error('The short may have expired or never existed.')
      process.exit(1)
    } else if (response.statusCode === 400) {
      spinner.fail('Invalid request')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    } else {
      spinner.fail('Failed to fetch short')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
