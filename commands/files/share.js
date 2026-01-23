import { apiRequest, handleApiError } from '../../utils/api.js'
import ora from 'ora'
import clipboard from 'clipboardy'

/**
 * Share file command
 * Creates a share link for a file
 * @param {string} fileId - File ID to share
 * @param {object} options - Command options
 */
export async function shareFile (fileId, options) {
  const spinner = ora('Creating share link...').start()

  try {
    // Determine share type
    const isPublic = options.public
    const password = options.password
    const useMar = options.mar
    const expiresInDays = options.expires ? parseInt(options.expires, 10) : undefined

    // Validate options
    if (!isPublic && !password) {
      spinner.fail('Invalid options')
      console.error('\nError: Either --public or --password must be specified.')
      console.error('\nExamples:')
      console.error('  oio files share abc --public')
      console.error('  oio files share abc --password secret123')
      console.error('  oio files share abc --public --mar')
      process.exit(1)
    }

    const body = {
      isPublic: isPublic || false,
      useMar: useMar || false
    }

    if (password) {
      body.password = password
    }

    if (expiresInDays) {
      body.expiresInDays = expiresInDays
    }

    const response = await apiRequest(`/files/${fileId}/share`, {
      method: 'POST',
      body
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

    if (response.statusCode === 400) {
      spinner.fail('Invalid request')
      console.error(`\nError: ${response.body.message || 'Invalid request'}`)
      process.exit(1)
    }

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      spinner.fail('Failed to create share')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    spinner.succeed('Share created!')

    const share = response.body

    console.log()
    if (share.type === 'presigned') {
      console.log('Type: Direct Download (presigned URL)')
      console.log(`Expires in: ${Math.floor(share.expiresIn / 60)} minutes`)
    } else {
      console.log(`Share ID: ${share.shareId}`)
      console.log(`Type: ${share.isPublic ? 'Public' : 'Password Protected'}`)
      if (share.useMar) {
        console.log('Domain: share.yumaverse.com')
      }
      console.log(`Expires: ${new Date(share.expiresAt * 1000).toLocaleString()}`)
    }
    console.log()
    console.log('Share URL:')
    console.log(share.shareUrl)

    // Copy share URL to clipboard
    try {
      await clipboard.write(share.shareUrl)
      console.log(`\n(Share URL copied to clipboard)`)
    } catch {
      // Clipboard may not be available
    }
  } catch (error) {
    spinner.stop()
    handleApiError(error)
  }
}
