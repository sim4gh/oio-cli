import { apiRequest, handleApiError } from '../../utils/api.js'
import ora from 'ora'

/**
 * Delete note command
 * Deletes a specific note
 * @param {string} noteId - Note ID
 */
export async function deleteCommand(noteId) {
  try {
    const spinner = ora('Deleting note...').start()

    const response = await apiRequest(`/notes/${noteId}`, {
      method: 'DELETE'
    })

    if (response.statusCode === 200) {
      spinner.succeed('Note deleted successfully')
      console.log(`\nNote ${noteId} has been deleted.`)
    } else if (response.statusCode === 404) {
      spinner.fail('Note not found')
      console.error(`Error: No note found with ID ${noteId}`)
      process.exit(1)
    } else {
      spinner.fail('Failed to delete note')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
