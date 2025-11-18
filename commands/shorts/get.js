import { apiRequest, handleApiError } from '../../utils/api.js'
import { formatExpiry } from '../../utils/ttl.js'
import ora from 'ora'

/**
 * Get short command
 * Retrieves and displays a specific short
 * @param {string} shortId - Short ID
 */
export async function getShort(shortId) {
  try {
    const spinner = ora('Fetching short...').start()

    const response = await apiRequest(`/shorts/${shortId}`)

    if (response.statusCode === 200) {
      spinner.succeed('Short fetched successfully')

      const { content, createdAt, expiresAt } = response.body

      console.log('\n' + '='.repeat(60))
      console.log(`Short ID: ${shortId}`)
      console.log(`Created: ${createdAt ? new Date(createdAt * 1000).toISOString() : 'N/A'}`)
      console.log(`Expires: ${expiresAt ? formatExpiry(expiresAt) : 'N/A'}`)
      console.log(`Expires At: ${expiresAt ? new Date(expiresAt * 1000).toISOString() : 'N/A'}`)
      console.log('='.repeat(60))
      console.log()
      console.log(content)
      console.log()
    } else if (response.statusCode === 404) {
      spinner.fail('Short not found')
      console.error(`Error: No short found with ID ${shortId}`)
      console.error('The short may have expired or never existed.')
      process.exit(1)
    } else {
      spinner.fail('Failed to fetch short')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
