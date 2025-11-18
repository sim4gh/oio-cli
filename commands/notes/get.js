import { apiRequest, handleApiError } from '../../utils/api.js'
import ora from 'ora'

/**
 * Get note command
 * Retrieves and displays a specific note
 * @param {string} noteId - Note ID
 */
export async function getCommand(noteId) {
  try {
    const spinner = ora('Fetching note...').start()

    const response = await apiRequest(`/notes/${noteId}`)

    if (response.statusCode === 200) {
      spinner.succeed('Note fetched successfully')

      const { title, content, createdAt, updatedAt } = response.body

      console.log('\n' + '='.repeat(60))
      console.log(`Title: ${title}`)
      console.log(`Created: ${createdAt}`)
      console.log(`Updated: ${updatedAt}`)
      console.log('='.repeat(60))
      console.log()
      console.log(content)
      console.log()
    } else if (response.statusCode === 404) {
      spinner.fail('Note not found')
      console.error(`Error: No note found with ID ${noteId}`)
      process.exit(1)
    } else {
      spinner.fail('Failed to fetch note')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
