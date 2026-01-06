import { apiRequest, handleApiError } from '../../utils/api.js'
import { parseTTL } from '../../utils/ttl.js'
import ora from 'ora'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import clipboardy from 'clipboardy'

const execAsync = promisify(exec)

/**
 * Capture Screenshot Command
 * Takes a screenshot using macOS screencapture and uploads it
 * @param {object} options - Command options
 */
export async function captureScreenshot(options) {
  if (process.platform !== 'darwin') {
    console.error('Error: Screenshot capture is only supported on macOS')
    process.exit(1)
  }

  const tempFile = join(tmpdir(), `oio-screenshot-${Date.now()}.png`)
  let spinner = ora('Taking screenshot...').start()

  try {
    // Determine screencapture mode
    let captureArgs = '-i' // default: interactive selection
    if (options.window) {
      captureArgs = '-w' // window capture
    } else if (options.fullscreen) {
      captureArgs = '' // full screen (no flag needed, just filename)
    }

    spinner.text = 'Waiting for screenshot selection...'
    spinner.stop() // Stop spinner during interactive selection

    // Take screenshot
    const command = `screencapture ${captureArgs} "${tempFile}"`
    await execAsync(command)

    // Check if file was created (user might cancel)
    let imageBuffer
    try {
      imageBuffer = await readFile(tempFile)
    } catch (err) {
      console.log('Screenshot cancelled')
      process.exit(0)
    }

    if (imageBuffer.length === 0) {
      console.log('Screenshot cancelled')
      await cleanupTempFile(tempFile)
      process.exit(0)
    }

    spinner = ora('Uploading screenshot...').start()

    // Upload the screenshot
    await uploadScreenshot(imageBuffer, 'image/png', options.ttl, spinner)

    // Cleanup temp file
    await cleanupTempFile(tempFile)

  } catch (error) {
    spinner.fail('Failed to capture screenshot')
    await cleanupTempFile(tempFile)
    handleApiError(error)
  }
}

/**
 * Clipboard Screenshot Command
 * Uploads an image from clipboard
 * @param {object} options - Command options
 */
export async function clipboardScreenshot(options) {
  if (process.platform !== 'darwin') {
    console.error('Error: Clipboard image extraction is only supported on macOS')
    process.exit(1)
  }

  const spinner = ora('Reading clipboard image...').start()

  // Check if pngpaste is installed
  try {
    await execAsync('which pngpaste')
  } catch {
    spinner.fail('pngpaste not found')
    console.error('\nTo use clipboard images, install pngpaste:')
    console.error('  brew install pngpaste')
    process.exit(1)
  }

  const tempFile = join(tmpdir(), `oio-clipboard-${Date.now()}.png`)

  try {
    // Extract image from clipboard using pngpaste
    await execAsync(`pngpaste "${tempFile}"`)

    let imageBuffer
    try {
      imageBuffer = await readFile(tempFile)
    } catch {
      spinner.fail('No image in clipboard')
      console.error('Hint: Copy an image to clipboard first (e.g., Cmd+Shift+4 then Ctrl+Click)')
      process.exit(1)
    }

    if (imageBuffer.length === 0) {
      spinner.fail('Clipboard image is empty')
      await cleanupTempFile(tempFile)
      process.exit(1)
    }

    spinner.succeed('Clipboard image read successfully')
    const uploadSpinner = ora('Uploading image...').start()

    // Upload the image
    await uploadScreenshot(imageBuffer, 'image/png', options.ttl, uploadSpinner)

    // Cleanup temp file
    await cleanupTempFile(tempFile)

  } catch (error) {
    spinner.fail('Failed to read clipboard image')
    await cleanupTempFile(tempFile)

    if (error.stderr && error.stderr.includes('No image data')) {
      console.error('Error: No image found in clipboard')
      console.error('Hint: Copy an image to clipboard first')
    } else {
      handleApiError(error)
    }
    process.exit(1)
  }
}

/**
 * Upload screenshot to API
 */
async function uploadScreenshot(imageBuffer, contentType, ttlOption, spinner) {
  // Parse and validate TTL
  let ttlSeconds
  try {
    ttlSeconds = parseTTL(ttlOption || '24h')
  } catch (error) {
    spinner.fail('Invalid TTL format')
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }

  // Convert to base64
  const base64Data = imageBuffer.toString('base64')

  // Create screenshot via API
  const response = await apiRequest('/screenshots', {
    method: 'POST',
    body: {
      contentType,
      data: base64Data,
      ttl: `${ttlSeconds}s`
    }
  })

  if (response.statusCode === 201) {
    spinner.succeed('Screenshot uploaded successfully')

    // Get the download URL
    const urlResponse = await apiRequest(`/screenshots/${response.body.screenshotId}`, {
      method: 'GET'
    })

    if (urlResponse.statusCode === 200) {
      const downloadUrl = urlResponse.body.downloadUrl

      console.log(`\nScreenshot ID: ${response.body.screenshotId}`)
      console.log(`URL: ${downloadUrl}`)
      console.log(`Expires: ${formatExpiry(response.body.expiresAt)}`)

      // Copy URL to clipboard
      try {
        await clipboardy.write(downloadUrl)
        console.log('\n✓ URL copied to clipboard')
      } catch {
        // Silently ignore clipboard errors
      }
    } else {
      console.log(`\nScreenshot ID: ${response.body.screenshotId}`)
      console.log(`Expires: ${formatExpiry(response.body.expiresAt)}`)
      console.log('\nUse `oio sc get <id>` to get the download URL')
    }
  } else if (response.statusCode === 413) {
    spinner.fail('Image too large')
    console.error(`Error: ${response.body.message}`)
    process.exit(1)
  } else if (response.statusCode === 400) {
    spinner.fail('Invalid request')
    console.error(`Error: ${response.body.message}`)
    process.exit(1)
  } else {
    spinner.fail('Failed to upload screenshot')
    console.error(`Error: ${response.body.message || 'Unknown error'}`)
    process.exit(1)
  }
}

/**
 * Format expiry timestamp
 */
function formatExpiry(expiresAt) {
  if (!expiresAt) return 'N/A'

  const now = Math.floor(Date.now() / 1000)
  const remaining = expiresAt - now

  if (remaining <= 0) return 'expired'
  if (remaining < 60) return `${remaining}s`
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`
  return `${Math.floor(remaining / 86400)}d`
}

/**
 * Cleanup temp file
 */
async function cleanupTempFile(filepath) {
  try {
    await unlink(filepath)
  } catch {
    // Ignore cleanup errors
  }
}
