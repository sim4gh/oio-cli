import { apiRequest, handleApiError } from '../../utils/api.js'
import { readNoteFile, validateNoteSize } from '../../utils/file.js'
import { editInEditor, getEditorName } from '../../utils/editor.js'
import ora from 'ora'

/**
 * Update note command
 * Updates a note from a file or interactive editor
 * @param {string} noteId - Note ID
 * @param {object} options - Command options
 */
export async function updateCommand(noteId, options) {
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
      // Otherwise, fetch current content and open in editor
      const fetchSpinner = ora('Fetching current note...').start()

      const fetchResponse = await apiRequest(`/notes/${noteId}`)

      if (fetchResponse.statusCode !== 200) {
        fetchSpinner.fail('Failed to fetch note')
        if (fetchResponse.statusCode === 404) {
          console.error(`Error: No note found with ID ${noteId}`)
        } else {
          console.error(`Error: ${fetchResponse.body.message || 'Unknown error'}`)
        }
        process.exit(1)
      }

      fetchSpinner.succeed('Current note fetched')

      const currentContent = fetchResponse.body.content
      const editorName = getEditorName()
      console.log(`Opening ${editorName} to edit note...`)
      console.log('(Save and close the editor when done)')

      try {
        content = await editInEditor(currentContent, '.md')
        validateNoteSize(content)
      } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
      }

      // Check if content changed
      if (content === currentContent) {
        console.log('No changes detected. Note not updated.')
        return
      }
    }

    // Update note via API
    const spinner = ora('Updating note...').start()

    const response = await apiRequest(`/notes/${noteId}`, {
      method: 'PUT',
      body: { content }
    })

    if (response.statusCode === 200) {
      spinner.succeed('Note updated successfully')
      console.log(`\nNote ID: ${response.body.noteId}`)
      console.log(`Title: ${response.body.title}`)
      console.log(`Updated: ${response.body.updatedAt}`)
    } else if (response.statusCode === 404) {
      spinner.fail('Note not found')
      console.error(`Error: No note found with ID ${noteId}`)
      process.exit(1)
    } else if (response.statusCode === 413) {
      spinner.fail('Note too large')
      console.error(`Error: ${response.body.message}`)
      process.exit(1)
    } else {
      spinner.fail('Failed to update note')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
