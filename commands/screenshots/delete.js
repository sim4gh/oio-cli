import { apiRequest, handleApiError } from '../../utils/api.js'
import ora from 'ora'
import Enquirer from 'enquirer'

const { Confirm } = Enquirer

/**
 * Delete Screenshot Command
 * Deletes a screenshot by ID
 * @param {string} screenshotId - Screenshot ID to delete
 * @param {object} options - Command options
 */
export async function deleteScreenshot(screenshotId, options) {
  // Confirm deletion unless --force is used
  if (!options.force) {
    try {
      const prompt = new Confirm({
        name: 'confirm',
        message: `Delete screenshot ${screenshotId}?`
      })
      const confirmed = await prompt.run()
      if (!confirmed) {
        console.log('Cancelled')
        return
      }
    } catch {
      console.log('Cancelled')
      return
    }
  }

  const spinner = ora('Deleting screenshot...').start()

  try {
    const response = await apiRequest(`/screenshots/${screenshotId}`, {
      method: 'DELETE'
    })

    if (response.statusCode === 204) {
      spinner.succeed(`Screenshot ${screenshotId} deleted`)
    } else if (response.statusCode === 404) {
      spinner.warn(`Screenshot ${screenshotId} not found (may have expired)`)
    } else {
      spinner.fail('Failed to delete screenshot')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    spinner.fail('Failed to delete screenshot')
    handleApiError(error)
  }
}
