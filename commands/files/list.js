import { apiRequest, handleApiError } from '../../utils/api.js'
import Table from 'cli-table3'
import ora from 'ora'

/**
 * Format file size to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes (bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Format date for display
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate (isoDate) {
  if (!isoDate) return 'N/A'
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * List files command
 * Lists all files in the user's Files storage
 * @param {object} options - Command options
 */
export async function listFiles (options) {
  const spinner = ora('Loading files...').start()

  try {
    const queryParams = []
    if (options.limit) {
      queryParams.push(`limit=${options.limit}`)
    }
    if (options.nextToken) {
      queryParams.push(`nextToken=${encodeURIComponent(options.nextToken)}`)
    }

    const path = queryParams.length > 0 ? `/files?${queryParams.join('&')}` : '/files'
    const response = await apiRequest(path)

    if (response.statusCode === 403) {
      spinner.fail('Pro subscription required')
      console.error('\nError: The Files feature requires a Pro subscription.')
      console.error('Contact support for subscription options.')
      process.exit(1)
    }

    if (response.statusCode !== 200) {
      spinner.fail('Failed to list files')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }

    spinner.stop()

    const { files, count, nextToken } = response.body

    if (files.length === 0) {
      console.log('No files found.')
      console.log('\nUse "oio files add <filepath>" to upload a file.')
      return
    }

    // Check if any files have descriptions or are temporary
    const hasDescriptions = files.some(f => f.description)
    const hasTemporary = files.some(f => f.temporary)

    // Create table with appropriate columns
    const tableConfig = hasDescriptions
      ? {
          head: ['ID', 'Filename', 'Size', 'Description', 'Created'],
          colWidths: [8, 32, 12, 30, 22],
          style: { head: ['cyan'] }
        }
      : {
          head: ['ID', 'Filename', 'Size', 'Type', 'Created'],
          colWidths: [8, 40, 12, 25, 22],
          style: { head: ['cyan'] }
        }

    const table = new Table(tableConfig)

    for (const file of files) {
      // Add [TMP] indicator for temporary files
      const tmpIndicator = file.temporary ? ' [TMP]' : ''

      if (hasDescriptions) {
        const desc = file.description || '-'
        table.push([
          file.fileId + tmpIndicator,
          file.filename.length > 30 ? file.filename.substring(0, 27) + '...' : file.filename,
          formatBytes(file.size),
          desc.length > 28 ? desc.substring(0, 25) + '...' : desc,
          formatDate(file.createdAt)
        ])
      } else {
        table.push([
          file.fileId + tmpIndicator,
          file.filename.length > 38 ? file.filename.substring(0, 35) + '...' : file.filename,
          formatBytes(file.size),
          file.contentType.length > 23 ? file.contentType.substring(0, 20) + '...' : file.contentType,
          formatDate(file.createdAt)
        ])
      }
    }

    // Show legend if there are temporary files
    if (hasTemporary) {
      console.log('[TMP] = Temporary file (auto-deletes after 24 hours)\n')
    }

    console.log(table.toString())
    console.log(`\nTotal: ${count} file(s)`)

    if (nextToken) {
      console.log(`\nMore files available. Use --next-token "${nextToken}" to see more.`)
    }
  } catch (error) {
    spinner.stop()
    handleApiError(error)
  }
}
