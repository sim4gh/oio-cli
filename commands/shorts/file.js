import { apiRequest, handleApiError } from '../../utils/api.js'
import { uploadParts, formatBytes, createProgressBar } from '../../utils/multipart-upload.js'
import { parseTTL } from '../../utils/ttl.js'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { basename } from 'path'
import ora from 'ora'
import clipboard from 'clipboardy'
import { lookup } from 'mime-types'

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024 // 150MB
const PART_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_TTL_SECONDS = 7 * 24 * 3600 // 7 days

/**
 * Upload file as a short command
 * @param {string} filePath - Path to the file to upload
 * @param {object} options - Command options
 */
export async function fileShort (filePath, options) {
  try {
    // Validate file exists
    if (!filePath) {
      console.error('Error: File path is required')
      process.exit(1)
    }

    if (!existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`)
      process.exit(1)
    }

    // Get file stats
    const fileStat = await stat(filePath)
    const fileSize = fileStat.size

    if (fileSize === 0) {
      console.error('Error: Cannot upload empty file')
      process.exit(1)
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      console.error(`Error: File too large. Maximum size is 150MB, file is ${formatBytes(fileSize)}`)
      process.exit(1)
    }

    // Get filename
    const filename = basename(filePath)

    // Detect content type
    const contentType = lookup(filePath) || 'application/octet-stream'

    // Parse and validate TTL
    let ttlString = options.ttl || '24h'
    let ttlSeconds
    try {
      ttlSeconds = parseTTL(ttlString)
      // Enforce max TTL for file shorts
      if (ttlSeconds > MAX_TTL_SECONDS) {
        console.log(`Note: TTL capped at 7 days (168h) for file shorts`)
        ttlSeconds = MAX_TTL_SECONDS
        ttlString = '168h'
      }
    } catch (error) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    console.log(`File: ${filename}`)
    console.log(`Size: ${formatBytes(fileSize)}`)
    console.log(`Type: ${contentType}`)
    console.log(`TTL: ${ttlString}`)
    console.log()

    // Read file into buffer
    const spinner = ora('Reading file...').start()
    let fileBuffer
    try {
      fileBuffer = await readFile(filePath)
      spinner.succeed('File read successfully')
    } catch (error) {
      spinner.fail('Failed to read file')
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    // Initialize multipart upload
    spinner.start('Initializing upload...')
    const initResponse = await apiRequest('/shorts/file/init', {
      method: 'POST',
      body: {
        filename,
        contentType,
        fileSize,
        ttl: ttlString
      }
    })

    if (initResponse.statusCode !== 201) {
      spinner.fail('Failed to initialize upload')
      console.error(`Error: ${initResponse.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    const { shortId, uploadId, presignedUrls, partSize, expiresAt } = initResponse.body
    spinner.succeed(`Upload initialized (ID: ${shortId})`)

    // Upload parts with progress
    const totalParts = presignedUrls.length
    spinner.start(`Uploading 0/${totalParts} parts...`)

    let completedParts
    try {
      completedParts = await uploadParts(
        presignedUrls,
        fileBuffer,
        partSize || PART_SIZE_BYTES,
        (completed, total, completedBytes, totalBytes) => {
          const progress = createProgressBar(completedBytes, totalBytes)
          spinner.text = `Uploading ${completed}/${total} parts... ${progress} ${formatBytes(completedBytes)}/${formatBytes(totalBytes)}`
        }
      )
      spinner.succeed(`Uploaded ${totalParts} parts`)
    } catch (error) {
      spinner.fail('Upload failed')
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    // Complete multipart upload
    spinner.start('Finalizing upload...')
    const completeResponse = await apiRequest('/shorts/file/complete', {
      method: 'POST',
      body: {
        shortId,
        parts: completedParts
      }
    })

    if (completeResponse.statusCode !== 200) {
      spinner.fail('Failed to complete upload')
      console.error(`Error: ${completeResponse.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    spinner.succeed('Upload complete!')
    console.log()
    console.log(`Short ID: ${shortId}`)
    console.log(`Expires: ${expiresAt ? new Date(expiresAt * 1000).toISOString() : 'N/A'}`)

    // Copy short ID to clipboard
    try {
      await clipboard.write(shortId)
      console.log(`\n(Short ID copied to clipboard)`)
    } catch {
      // Clipboard may not be available in all environments
    }
  } catch (error) {
    handleApiError(error)
  }
}
