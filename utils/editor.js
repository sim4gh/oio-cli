import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { spawnSync } from 'child_process'

/**
 * Get the user's preferred editor
 * @returns {string} Editor command
 */
function getEditor() {
  return process.env.VISUAL || process.env.EDITOR || 'vim'
}

/**
 * Open content in editor and return edited content
 * @param {string} initialContent - Initial content to edit (optional)
 * @param {string} extension - File extension (default: .md)
 * @returns {Promise<string>} Edited content
 * @throws {Error} If editor fails or user cancels
 */
export async function editInEditor(initialContent = '', extension = '.md') {
  // Create temporary file
  const tmpFileName = `oio-note-${randomBytes(8).toString('hex')}${extension}`
  const tmpFilePath = join(tmpdir(), tmpFileName)

  try {
    // Write initial content to temp file
    await writeFile(tmpFilePath, initialContent, 'utf8')

    // Get editor command
    const editor = getEditor()

    // Open editor
    const result = spawnSync(editor, [tmpFilePath], {
      stdio: 'inherit',
      shell: true
    })

    if (result.error) {
      throw new Error(`Failed to open editor: ${result.error.message}`)
    }

    if (result.status !== 0) {
      throw new Error('Editor exited with non-zero status. Changes not saved.')
    }

    // Read edited content
    const editedContent = await readFile(tmpFilePath, 'utf8')

    // Clean up temp file
    await unlink(tmpFilePath)

    // Check if content is empty
    if (!editedContent.trim()) {
      throw new Error('Content is empty. Note not saved.')
    }

    return editedContent
  } catch (error) {
    // Try to clean up temp file on error
    try {
      await unlink(tmpFilePath)
    } catch {}
    throw error
  }
}

/**
 * Prompt user with editor choice message
 * @returns {string} Editor name
 */
export function getEditorName() {
  const editor = getEditor()
  return editor.split('/').pop().split(' ')[0] // Get just the command name
}
