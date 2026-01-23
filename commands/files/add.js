import { apiRequest, handleApiError } from '../../utils/api.js'
import { uploadParts, formatBytes, createProgressBar } from '../../utils/multipart-upload.js'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { basename } from 'path'
import ora from 'ora'
import clipboard from 'clipboardy'
import { lookup } from 'mime-types'

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024 * 1024 // 1GB
const PART_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * Add file command
 * Uploads a file to the Files storage (Pro subscription required)
 * @param {string} filePath - Path to the file to upload
 * @param {object} options - Command options
 */
export async function addFile (filePath, options) {
  const description = options?.description
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
      console.error(`Error: File too large. Maximum size is 1GB, file is ${formatBytes(fileSize)}`)
      process.exit(1)
    }

    // Get filename
    const filename = basename(filePath)

    // Detect content type
    const contentType = lookup(filePath) || 'application/octet-stream'

    console.log(`File: ${filename}`)
    console.log(`Size: ${formatBytes(fileSize)}`)
    console.log(`Type: ${contentType}`)
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
    const initBody = {
      filename,
      contentType,
      fileSize
    }

    if (description) {
      initBody.description = description
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
