import { apiRequest, handleApiError } from '../../utils/api.js'
import ora from 'ora'
import clipboardy from 'clipboardy'

/**
 * Get Screenshot Command
 * Gets a screenshot's download URL
 * @param {string} screenshotId - Screenshot ID to get
 */
export async function getScreenshot(screenshotId) {
  const spinner = ora('Fetching screenshot...').start()

  try {
    const response = await apiRequest(`/screenshots/${screenshotId}`, {
      method: 'GET'
    })

    if (response.statusCode === 200) {
      spinner.succeed('Screenshot found')

      const screenshot = response.body

      console.log(`\nScreenshot ID: ${screenshot.screenshotId}`)
      console.log(`Size: ${formatSize(screenshot.fileSize)}`)
      console.log(`Type: ${screenshot.contentType}`)
      console.log(`Expires: ${formatExpiry(screenshot.expiresAt)}`)
      console.log(`Created: ${screenshot.createdAt}`)
      console.log(`\nURL: ${screenshot.downloadUrl}`)

      // Copy URL to clipboard
      try {
        await clipboardy.write(screenshot.downloadUrl)
        console.log('\n✓ URL copied to clipboard')
      } catch {
        // Silently ignore clipboard errors
      }
    } else if (response.statusCode === 404) {
      spinner.fail('Screenshot not found or expired')
      process.exit(1)
    } else {
      spinner.fail('Failed to get screenshot')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    spinner.fail('Failed to get screenshot')
    handleApiError(error)
  }
}

/**
 * Format file size in human-readable format
 */
function formatSize(bytes) {
  if (!bytes) return 'N/A'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/**
 * Format expiry timestamp
 */
function formatExpiry(expiresAt) {
  if (!expiresAt) return 'N/A'

  const now = Math.floor(Date.now() / 1000)
  const remaining = expiresAt - now

  if (remaining <= 0) return 'expired'
  if (remaining < 60) return `${remaining}s`
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`
  return `${Math.floor(remaining / 86400)}d`
}
