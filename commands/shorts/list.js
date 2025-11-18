import { apiRequest, handleApiError } from '../../utils/api.js'
import { formatShortsTable } from '../../utils/shorts-table.js'
import ora from 'ora'

/**
 * List shorts command
 * Lists all shorts with preview and expiry info
 * @param {object} options - Command options
 */
export async function listShorts(options) {
  try {
    const spinner = ora('Fetching shorts...').start()

    const response = await apiRequest('/shorts')

    if (response.statusCode === 200) {
      spinner.succeed('Shorts fetched successfully')

      const { shorts, hasMore, nextToken } = response.body

      console.log('\n' + formatShortsTable(shorts))

      if (hasMore) {
        console.log(`\nShowing ${shorts.length} shorts. More shorts available.`)
        console.log(`Note: Pagination navigation coming soon.`)
      } else {
        console.log(`\nTotal shorts: ${shorts.length}`)
      }
    } else {
      spinner.fail('Failed to fetch shorts')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
