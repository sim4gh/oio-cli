import { apiRequest, handleApiError } from '../../utils/api.js'
import ora from 'ora'
import Table from 'cli-table3'

/**
 * List Screenshots Command
 * Lists all screenshots for the authenticated user
 */
export async function listScreenshots() {
  const spinner = ora('Fetching screenshots...').start()

  try {
    const response = await apiRequest('/screenshots', {
      method: 'GET'
    })

    if (response.statusCode === 200) {
      const { screenshots, hasMore } = response.body
      spinner.succeed(`Found ${screenshots.length} screenshot(s)`)

      if (screenshots.length === 0) {
        console.log('\nNo screenshots found')
        return
      }

      // Create table
      const table = new Table({
        head: ['ID', 'Size', 'Expires', 'Created'],
        style: { head: ['cyan'] }
      })

      const now = Math.floor(Date.now() / 1000)

      screenshots.forEach(screenshot => {
        table.push([
          screenshot.screenshotId,
          formatSize(screenshot.fileSize),
          formatExpiry(screenshot.expiresAt, now),
          formatDate(screenshot.createdAt)
        ])
      })

      console.log('')
      console.log(table.toString())

      if (hasMore) {
        console.log('\n(More screenshots available)')
      }
    } else {
      spinner.fail('Failed to list screenshots')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    spinner.fail('Failed to list screenshots')
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
function formatExpiry(expiresAt, now) {
  if (!expiresAt) return 'N/A'

  const remaining = expiresAt - now

  if (remaining <= 0) return 'expired'
  if (remaining < 60) return `${remaining}s`
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`
  return `${Math.floor(remaining / 86400)}d`
}

/**
 * Format ISO date to short format
 */
function formatDate(isoDate) {
  if (!isoDate) return 'N/A'
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
