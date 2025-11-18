import { apiRequest, handleApiError } from '../../utils/api.js'
import enquirer from 'enquirer'
import ora from 'ora'

const { Confirm } = enquirer

/**
 * Delete short command
 * Deletes a specific short with optional confirmation
 * @param {string} shortId - Short ID
 * @param {object} options - Command options
 */
export async function deleteShort(shortId, options) {
  try {
    // Skip confirmation if --force flag is provided
    if (!options.force) {
      const prompt = new Confirm({
        name: 'confirm',
        message: `Are you sure you want to delete short ${shortId}?`
      })

      const confirmed = await prompt.run()

      if (!confirmed) {
        console.log('Deletion cancelled')
        return
      }
    }

    const spinner = ora('Deleting short...').start()

    const response = await apiRequest(`/shorts/${shortId}`, {
      method: 'DELETE'
    })

    if (response.statusCode === 204 || response.statusCode === 200) {
      spinner.succeed('Short deleted successfully')
      console.log(`\nShort ${shortId} has been deleted.`)
    } else if (response.statusCode === 404) {
      spinner.fail('Short not found')
      console.error(`Error: No short found with ID ${shortId}`)
      console.error('The short may have already expired or been deleted.')
      process.exit(1)
    } else {
      spinner.fail('Failed to delete short')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    if (error.message === '') {
      // User cancelled the prompt
      console.log('\nDeletion cancelled')
      return
    }
    handleApiError(error)
  }
}
