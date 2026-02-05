import { apiRequest, handleApiError } from '../../utils/api.js'
import { uploadParts, uploadPartsFromFile, formatBytes, createProgressBar } from '../../utils/multipart-upload.js'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { basename } from 'path'
import ora from 'ora'
import clipboard from 'clipboardy'
import { lookup } from 'mime-types'

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024 * 1024 // 1GB
const MAX_TEMP_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024 // 10GB for temporary files
const PART_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * Add file command
 * Uploads a file to the Files storage (Pro subscription required)
 * @param {string} filePath - Path to the file to upload
 * @param {object} options - Command options
 */
export async function addFile (filePath, options) {
  const description = options?.description
  const isTemporary = options?.tmp || false
  const maxSize = isTemporary ? MAX_TEMP_FILE_SIZE_BYTES : MAX_FILE_SIZE_BYTES
  const maxSizeLabel = isTemporary ? '10GB' : '1GB'
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
    if (fileSize > maxSize) {
      console.error(`Error: File too large. Maximum size is ${maxSizeLabel}, file is ${formatBytes(fileSize)}`)
      process.exit(1)
    }

    // Get filename
    const filename = basename(filePath)

    // Detect content type
    const contentType = lookup(filePath) || 'application/octet-stream'

    console.log(`File: ${filename}`)
    console.log(`Size: ${formatBytes(fileSize)}`)
    console.log(`Type: ${contentType}`)
    if (isTemporary) {
      console.log(`Mode: Temporary (auto-deletes in 24 hours)`)
    }
    console.log()

    // For files > 2GB, we'll stream directly from disk instead of loading into memory
    const useStreaming = fileSize > 2 * 1024 * 1024 * 1024 // 2GB threshold

    const spinner = ora('Initializing upload...').start()
    const initBody = {
      filename,
      contentType,
      fileSize
    }

    if (description) {
      initBody.description = description
    }

    if (isTemporary) {
      initBody.temporary = true
    }

    const initResponse = await apiRequest('/files/init', {
      method: 'POST',
      body: initBody
    })

    if (initResponse.statusCode === 403) {
      spinner.fail('Pro subscription required')
      console.error('\nError: The Files feature requires a Pro subscription.')
      console.error('Contact support for subscription options.')
      process.exit(1)
    }

    if (initResponse.statusCode !== 201) {
      spinner.fail('Failed to initialize upload')
      console.error(`Error: ${initResponse.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    const { fileId, presignedUrls, partSize } = initResponse.body
    spinner.succeed(`Upload initialized (ID: ${fileId})`)

    // Upload parts with progress
    const totalParts = presignedUrls.length
    spinner.start(`Uploading 0/${totalParts} parts...`)

    let completedParts
    try {
      if (useStreaming) {
        // Stream directly from file for large files (> 2GB)
        completedParts = await uploadPartsFromFile(
          presignedUrls,
          filePath,
          fileSize,
          partSize || PART_SIZE_BYTES,
          (completed, total, completedBytes, totalBytes) => {
            const progress = createProgressBar(completedBytes, totalBytes)
            spinner.text = `Uploading ${completed}/${total} parts... ${progress} ${formatBytes(completedBytes)}/${formatBytes(totalBytes)}`
          }
        )
      } else {
        // Read file into buffer for smaller files
        spinner.text = 'Reading file...'
        const fileBuffer = await readFile(filePath)
        spinner.text = `Uploading 0/${totalParts} parts...`

        completedParts = await uploadParts(
          presignedUrls,
          fileBuffer,
          partSize || PART_SIZE_BYTES,
          (completed, total, completedBytes, totalBytes) => {
            const progress = createProgressBar(completedBytes, totalBytes)
            spinner.text = `Uploading ${completed}/${total} parts... ${progress} ${formatBytes(completedBytes)}/${formatBytes(totalBytes)}`
          }
        )
      }
      spinner.succeed(`Uploaded ${totalParts} parts`)
    } catch (error) {
      spinner.fail('Upload failed')
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    // Complete multipart upload
    spinner.start('Finalizing upload...')
    const completeResponse = await apiRequest('/files/complete', {
      method: 'POST',
      body: {
        fileId,
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
    console.log(`File ID: ${fileId}`)
    console.log(`Filename: ${completeResponse.body.filename}`)
    console.log(`Size: ${formatBytes(completeResponse.body.size)}`)
    if (description) {
      console.log(`Description: ${description}`)
    }
    if (completeResponse.body.expiresAt) {
      const expiresDate = new Date(completeResponse.body.expiresAt * 1000)
      console.log(`Expires: ${expiresDate.toLocaleString()}`)
    }

    // Copy file ID to clipboard
    try {
      await clipboard.write(fileId)
      console.log(`\n(File ID copied to clipboard)`)
    } catch {
      // Clipboard may not be available in all environments
    }
  } catch (error) {
    handleApiError(error)
  }
}
