import Table from 'cli-table3'

/**
 * Format notes as a table
 * @param {Array} notes - Array of note objects
 * @returns {string} Formatted table string
 */
export function formatNotesTable(notes) {
  if (!notes || notes.length === 0) {
    return 'No notes found.'
  }

  const table = new Table({
    head: ['ID', 'Title', 'Attachments', 'Created', 'Updated'],
    colWidths: [12, 40, 30, 20, 20],
    wordWrap: true,
    wrapOnWordBoundary: true
  })

  notes.forEach(note => {
    // Format attachments
    let attachmentInfo = '-'
    if (note.attachments && note.attachments.length > 0) {
      const count = note.attachments.length
      const names = note.attachments
        .slice(0, 2)
        .map(a => a.fileName)
        .join(', ')
      attachmentInfo = count > 2 ? `${count} files (${names}, ...)` : `${count} file(s): ${names}`
    }

    table.push([
      note.noteId,
      note.title,
      attachmentInfo,
      formatDate(note.createdAt),
      formatDate(note.updatedAt)
    ])
  })

  return table.toString()
}

/**
 * Format ISO date to human-readable format
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // If within last minute
  if (diffMins < 1) return 'just now'

  // If within last hour
  if (diffMins < 60) return `${diffMins}m ago`

  // If within last day
  if (diffHours < 24) return `${diffHours}h ago`

  // If within last week
  if (diffDays < 7) return `${diffDays}d ago`

  // Otherwise show full date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Truncate string to max length with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength) {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}
