import { apiRequest, handleApiError } from '../../utils/api.js'
import { validateShortSize } from '../../utils/shorts-validator.js'
import { parseTTL } from '../../utils/ttl.js'
import clipboardy from 'clipboardy'
import ora from 'ora'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Check if clipboard contains image data (macOS only)
 */
async function clipboardHasImage() {
  if (process.platform !== 'darwin') return false
  try {
    const { stdout } = await execAsync("osascript -e 'clipboard info'")
    const imageTypes = ['PNGf', 'JPEG', 'TIFF', 'GIF', 'jp2 ', 'BMP', 'AVIF']
    return imageTypes.some(type => stdout.includes(type))
  } catch {
    return false
  }
}

/**
 * Clip short command
 * Creates a new short from clipboard content
 * @param {object} options - Command options
 */
export async function clipShort(options) {
  try {
    // Read from clipboard
    const spinner = ora('Reading clipboard...').start()
    let shortContent

    try {
      shortContent = await clipboardy.read()

      // Check if clipboard is empty
      if (!shortContent || shortContent.trim().length === 0) {
        if (await clipboardHasImage()) {
          spinner.fail('Clipboard contains an image, not text')
          console.error('Hint: Copy text content to use this command')
        } else {
          spinner.fail('Clipboard is empty')
        }
        process.exit(1)
      }

      spinner.succeed('Clipboard content read successfully')
    } catch (error) {
      spinner.fail('Failed to read clipboard')
      console.error('Error: Could not access clipboard. Make sure you have copied something to clipboard.')
      process.exit(1)
    }

    // Validate content
    try {
      validateShortSize(shortContent)
    } catch (error) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    // Parse and validate TTL
    let ttlSeconds
    try {
      ttlSeconds = parseTTL(options.ttl || '24h')
    } catch (error) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    // Create short via API
    const createSpinner = ora('Creating short...').start()

    const response = await apiRequest('/shorts', {
      method: 'POST',
      body: {
        content: shortContent,
        ttl: ttlSeconds
      }
    })

    if (response.statusCode === 201) {
      createSpinner.succeed('Short created successfully')
      console.log(`\nShort ID: ${response.body.shortId}`)
      console.log(`Expires: ${response.body.expiresAt ? new Date(response.body.expiresAt * 1000).toISOString() : 'N/A'}`)
    } else if (response.statusCode === 413) {
      createSpinner.fail('Content too large')
      console.error(`Error: ${response.body.message}`)
      process.exit(1)
    } else if (response.statusCode === 400) {
      createSpinner.fail('Invalid request')
      console.error(`Error: ${response.body.message}`)
      process.exit(1)
    } else {
      createSpinner.fail('Failed to create short')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
