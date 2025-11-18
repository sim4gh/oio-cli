import { apiRequest, handleApiError } from '../../utils/api.js'
import { readNoteFile, validateNoteSize } from '../../utils/file.js'
import { editInEditor, getEditorName } from '../../utils/editor.js'
import { parseAttachmentPaths, uploadFiles } from '../../utils/file-upload.js'
import ora from 'ora'

/**
 * Add note command
 * Creates a new note from a file or interactive editor
 * @param {string} title - Note title
 * @param {object} options - Command options
 */
export async function addCommand(title, options) {
  try {
    let content

    // If --body flag is provided, read from file
    if (options.body) {
      const spinner = ora('Reading note file...').start()
      try {
        content = await readNoteFile(options.body)
        spinner.succeed('Note file read successfully')
      } catch (error) {
        spinner.fail('Failed to read note file')
        throw error
      }
    } else {
      // Otherwise, open in editor
      const editorName = getEditorName()
      console.log(`Opening ${editorName} to compose note...`)
      console.log('(Save and close the editor when done)')

      try {
        content = await editInEditor('', '.md')
        validateNoteSize(content)
      } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
      }
    }

    // Create note via API
    const spinner = ora('Creating note...').start()

    const response = await apiRequest('/notes', {
      method: 'POST',
      body: {
        title,
        content
      }
    })

    if (response.statusCode === 201) {
      spinner.succeed('Note created successfully')
      console.log(`\nNote ID: ${response.body.noteId}`)
      console.log(`Title: ${response.body.title}`)
      console.log(`Created: ${response.body.createdAt}`)

      // Handle attachments if --attach option is provided
      if (options.attach) {
        const noteId = response.body.noteId
        const filePaths = parseAttachmentPaths(options.attach)

        if (filePaths.length > 0) {
          console.log(`\nUploading ${filePaths.length} attachment(s)...`)
          const uploadResults = await uploadFiles(noteId, filePaths)

          // Show summary
          const successful = uploadResults.filter(r => r.success).length
          const failed = uploadResults.filter(r => !r.success).length

          console.log(`\nAttachment upload summary: ${successful} succeeded, ${failed} failed`)

          // Show errors for failed uploads
          uploadResults
            .filter(r => !r.success)
            .forEach(r => console.error(`  - ${r.fileName}: ${r.error}`))
        }
      }
    } else if (response.statusCode === 413) {
      spinner.fail('Note too large')
      console.error(`Error: ${response.body.message}`)
      process.exit(1)
    } else {
      spinner.fail('Failed to create note')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
