import { apiRequest, handleApiError } from '../../utils/api.js'
import enquirer from 'enquirer'
const { prompt } = enquirer
import ora from 'ora'

/**
 * Delete file command
 * Deletes a file and all its shares
 * @param {string} fileId - File ID to delete
 * @param {object} options - Command options
 */
export async function deleteFile (fileId, options) {
  try {
    // If not forcing, confirm with user
    if (!options.force) {
      // First get file info
      const spinner = ora('Getting file info...').start()
      const infoResponse = await apiRequest(`/files/${fileId}`)

      if (infoResponse.statusCode === 404) {
        spinner.fail('File not found')
        console.error(`\nError: File with ID "${fileId}" not found.`)
        process.exit(1)
      }

      if (infoResponse.statusCode !== 200) {
        spinner.fail('Failed to get file info')
        console.error(`Error: ${infoResponse.body.message || 'Unknown error'}`)
        process.exit(1)
      }

      spinner.stop()

      const file = infoResponse.body

      console.log(`File: ${file.filename}`)
      console.log(`ID: ${file.fileId}`)
      console.log()

      const response = await prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Delete this file and all its shares?',
        initial: false
      })

      if (!response.confirm) {
        console.log('Cancelled.')
        return
      }
    }

    const spinner = ora('Deleting file...').start()

    const response = await apiRequest(`/files/${fileId}`, {
      method: 'DELETE'
    })

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

    if (response.statusCode !== 204) {
      spinner.fail('Failed to delete file')
      console.error(`Error: ${response.body?.message || 'Unknown error'}`)
      process.exit(1)
    }

    spinner.succeed('File deleted')
  } catch (error) {
    handleApiError(error)
  }
}
