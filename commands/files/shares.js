import { apiRequest, handleApiError } from '../../utils/api.js'
import Table from 'cli-table3'
import ora from 'ora'

/**
 * Format date for display
 * @param {string|number} date - ISO date string or Unix timestamp
 * @returns {string} Formatted date
 */
function formatDate (date) {
  if (!date) return 'N/A'
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * List shares command
 * Lists all shares for a specific file
 * @param {string} fileId - File ID to list shares for
 */
export async function listShares (fileId) {
  const spinner = ora('Loading shares...').start()

  try {
    const response = await apiRequest(`/files/${fileId}/shares`)

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
      spinner.fail('Failed to list shares')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    spinner.stop()

    const { shares, count } = response.body

    if (shares.length === 0) {
      console.log('No shares found for this file.')
      console.log('\nUse "oio files share <fileId> --public" or "--password <pw>" to create a share.')
      return
    }

    // Create table
    const table = new Table({
      head: ['Share ID', 'Type', 'Domain', 'Created', 'Expires'],
      colWidths: [12, 12, 25, 22, 22],
      style: { head: ['cyan'] }
    })

    for (const share of shares) {
      const type = share.passwordProtected ? 'Password' : 'Public'
      const domain = share.useMar ? 'share.yumaverse.com' : 'auth.yumaverse.com'

      table.push([
        share.shareId,
        type,
        domain,
        formatDate(share.createdAt),
        formatDate(share.expiresAt)
      ])
    }

    console.log(table.toString())
    console.log(`\nTotal: ${count} share(s)`)
    console.log('\nShare URLs:')
    for (const share of shares) {
      console.log(`  ${share.shareId}: ${share.shareUrl}`)
    }
  } catch (error) {
    spinner.stop()
    handleApiError(error)
  }
}
