import { apiRequest, handleApiError } from '../../utils/api.js'
import { formatNotesTable } from '../../utils/table.js'
import ora from 'ora'

/**
 * List notes command
 * Lists all notes with pagination
 * @param {object} options - Command options
 */
export async function listCommand(options) {
  try {
    const spinner = ora('Fetching notes...').start()

    // Build query parameters
    const queryParams = new URLSearchParams()
    if (options.page && options.page > 1) {
      // For pagination, we'd need to track nextToken between calls
      // For simplicity, we'll fetch from the beginning
      // In a production app, you'd want to cache pagination tokens
    }

    const path = `/notes${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await apiRequest(path)

    if (response.statusCode === 200) {
      spinner.succeed('Notes fetched successfully')

      const { notes, hasMore, nextToken } = response.body

      console.log('\n' + formatNotesTable(notes))

      if (hasMore) {
        console.log(`\nShowing ${notes.length} notes. More notes available.`)
        console.log(`Note: Pagination navigation coming soon.`)
      } else {
        console.log(`\nTotal notes: ${notes.length}`)
      }
    } else {
      spinner.fail('Failed to fetch notes')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
