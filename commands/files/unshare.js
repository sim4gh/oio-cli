import { apiRequest, handleApiError } from '../../utils/api.js'
import enquirer from 'enquirer'
const { prompt } = enquirer
import ora from 'ora'

/**
 * Unshare file command
 * Revokes/deletes a share link
 * @param {string} fileId - File ID
 * @param {string} shareId - Share ID to revoke
 * @param {object} options - Command options
 */
export async function unshareFile (fileId, shareId, options) {
  try {
    // If not forcing, confirm with user
    if (!options.force) {
      const response = await prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Revoke share link ${shareId}?`,
        initial: false
      })

      if (!response.confirm) {
        console.log('Cancelled.')
        return
      }
    }

    const spinner = ora('Revoking share...').start()

    const response = await apiRequest(`/files/${fileId}/share/${shareId}`, {
      method: 'DELETE'
    })

    if (response.statusCode === 403) {
      spinner.fail('Pro subscription required')
      console.error('\nError: The Files feature requires a Pro subscription.')
      process.exit(1)
    }

    if (response.statusCode === 404) {
      spinner.fail('Share not found')
      console.error(`\nError: Share with ID "${shareId}" not found.`)
      process.exit(1)
    }

    if (response.statusCode !== 204) {
      spinner.fail('Failed to revoke share')
      console.error(`Error: ${response.body?.message || 'Unknown error'}`)
      process.exit(1)
    }

    spinner.succeed('Share revoked')
  } catch (error) {
    handleApiError(error)
  }
}
