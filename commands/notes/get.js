import { apiRequest, handleApiError } from '../../utils/api.js'
import { listAttachments, getAttachmentDownloadUrl, downloadAttachmentFile } from '../../utils/attachment-api.js'
import { formatFileSize } from '../../utils/file-upload.js'
import ora from 'ora'
import enquirer from 'enquirer'
const { Select } = enquirer
import { join } from 'path'

/**
 * Get note command
 * Retrieves and displays a specific note
 * @param {string} noteId - Note ID
 */
export async function getCommand(noteId) {
  try {
    const spinner = ora('Fetching note...').start()

    const response = await apiRequest(`/notes/${noteId}`)

    if (response.statusCode === 200) {
      spinner.succeed('Note fetched successfully')

      const { title, content, createdAt, updatedAt, attachments } = response.body

      console.log('\n' + '='.repeat(60))
      console.log(`Title: ${title}`)
      console.log(`Created: ${createdAt}`)
      console.log(`Updated: ${updatedAt}`)

      // Show attachments if present
      if (attachments && attachments.length > 0) {
        console.log(`Attachments: ${attachments.length} file(s)`)
        attachments.forEach((att, idx) => {
          console.log(`  ${idx + 1}. ${att.fileName} (${formatFileSize(att.fileSize)})`)
        })
      } else {
        console.log(`Attachments: None`)
      }

      console.log('='.repeat(60))
      console.log()
      console.log(content)
      console.log()
    } else if (response.statusCode === 404) {
      spinner.fail('Note not found')
      console.error(`Error: No note found with ID ${noteId}`)
      process.exit(1)
    } else {
      spinner.fail('Failed to fetch note')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}

/**
 * Download attachments command
 * Downloads attachments from a note with interactive selection
 * @param {string} noteId - Note ID
 * @param {object} options - Command options
 */
export async function downloadCommand(noteId, options) {
  try {
    // Fetch attachments list
    const spinner = ora('Fetching attachments...').start()

    const response = await listAttachments(noteId)

    if (response.statusCode === 404) {
      spinner.fail('Note not found')
      console.error(`Error: No note found with ID ${noteId}`)
      process.exit(1)
    }

    if (response.statusCode !== 200) {
      spinner.fail('Failed to fetch attachments')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    const attachments = response.body.attachments || []

    if (attachments.length === 0) {
      spinner.info('No attachments found')
      console.log('This note has no attachments.')
      return
    }

    spinner.succeed(`Found ${attachments.length} attachment(s)`)

    // If --all flag is provided, download all attachments
    if (options.all) {
      console.log(`\nDownloading all ${attachments.length} attachment(s)...`)

      for (const attachment of attachments) {
        await downloadSingleAttachment(noteId, attachment, options.output)
      }

      console.log('\nAll attachments downloaded successfully')
      return
    }

    // Interactive selection for specific attachments
    const choices = attachments.map(att => ({
      name: `${att.fileName} (${formatFileSize(att.fileSize)})`,
      value: att.attachmentId,
      attachment: att
    }))

    const prompt = new Select({
      name: 'attachment',
      message: 'Select an attachment to download:',
      choices: choices.map(c => c.name)
    })

    const selectedName = await prompt.run()
    const selected = choices.find(c => c.name === selectedName)

    if (selected) {
      await downloadSingleAttachment(noteId, selected.attachment, options.output)
      console.log('\nAttachment downloaded successfully')
    }

  } catch (error) {
    if (error.message === '') {
      // User cancelled the prompt
      console.log('\nDownload cancelled')
      return
    }
    handleApiError(error)
  }
}

/**
 * Download a single attachment
 * @param {string} noteId - Note ID
 * @param {object} attachment - Attachment object
 * @param {string} outputDir - Output directory (optional)
 */
async function downloadSingleAttachment(noteId, attachment, outputDir) {
  const spinner = ora(`Downloading ${attachment.fileName}...`).start()

  try {
    // Get download URL
    const urlResponse = await getAttachmentDownloadUrl(noteId, attachment.attachmentId)

    if (urlResponse.statusCode !== 200) {
      spinner.fail(`Failed to get download URL for ${attachment.fileName}`)
      console.error(`Error: ${urlResponse.body.message || 'Unknown error'}`)
      return
    }

    const downloadUrl = urlResponse.body.downloadUrl

    // Determine output path
    const outputPath = outputDir
      ? join(outputDir, attachment.fileName)
      : attachment.fileName

    // Download file
    await downloadAttachmentFile(downloadUrl, outputPath)

    spinner.succeed(`Downloaded ${attachment.fileName} to ${outputPath}`)
  } catch (error) {
    spinner.fail(`Failed to download ${attachment.fileName}`)
    console.error(`Error: ${error.message}`)
  }
}
