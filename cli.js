#!/usr/bin/env node

import { program } from 'commander'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import login from './commands/login.js'
import logout from './commands/logout.js'
import whoami from './commands/whoami.js'
import { healthCommand } from './commands/health.js'
import { addCommand } from './commands/notes/add.js'
import { listCommand } from './commands/notes/list.js'
import { getCommand, downloadCommand } from './commands/notes/get.js'
import { updateCommand } from './commands/notes/update.js'
import { deleteCommand } from './commands/notes/delete.js'
import { addShort } from './commands/shorts/add.js'
import { clipShort } from './commands/shorts/clip.js'
import { fileShort } from './commands/shorts/file.js'
import { getShort } from './commands/shorts/get.js'
import { listShorts } from './commands/shorts/list.js'
import { deleteShort } from './commands/shorts/delete.js'
import { captureScreenshot, clipboardScreenshot } from './commands/screenshots/capture.js'
import { listScreenshots } from './commands/screenshots/list.js'
import { getScreenshot } from './commands/screenshots/get.js'
import { deleteScreenshot } from './commands/screenshots/delete.js'
import { addFile } from './commands/files/add.js'
import { listFiles } from './commands/files/list.js'
import { getFile } from './commands/files/get.js'
import { deleteFile } from './commands/files/delete.js'
import { shareFile } from './commands/files/share.js'
import { unshareFile } from './commands/files/unshare.js'
import { listShares } from './commands/files/shares.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'))

program
  .name('oio')
  .description('OIO CLI tool for authentication and management')
  .version(packageJson.version)

// Auth commands
const auth = program
  .command('auth')
  .alias('a')
  .description('Authentication commands')

auth
  .command('login')
  .alias('l')
  .description('Login using device flow authentication')
  .action(login)

auth
  .command('logout')
  .alias('lo')
  .description('Clear stored credentials and logout')
  .action(logout)

auth
  .command('whoami')
  .alias('w')
  .description('Show current user information')
  .action(whoami)

// Health command
program
  .command('health')
  .alias('h')
  .description('Check system health status')
  .action(healthCommand)

// Notes commands
const notes = program
  .command('notes')
  .alias('n')
  .description('Notes management commands')

notes
  .command('ls')
  .alias('l')
  .description('List all notes')
  .option('--page <number>', 'Page number', '1')
  .action(listCommand)

// Add note command (at root level)
program
  .command('add <title>')
  .description('Create a new note')
  .option('--body <filepath>', 'Path to markdown file')
  .option('--attach <files>', 'Comma-separated list of files to attach')
  .action(addCommand)

// Get note command (at root level)
program
  .command('get <id>')
  .description('Get a note by ID')
  .action(getCommand)

// Update note command (at root level)
program
  .command('upd <id>')
  .description('Update a note by ID')
  .option('--body <filepath>', 'Path to markdown file')
  .option('--attach <files>', 'Comma-separated list of files to attach')
  .action(updateCommand)

// Delete note command (at root level)
program
  .command('delete <id>')
  .alias('d')
  .description('Delete a note by ID')
  .action(deleteCommand)

// List notes command (at root level - alias for 'notes ls')
program
  .command('ls')
  .alias('l')
  .description('List all notes')
  .option('--page <number>', 'Page number', '1')
  .action(listCommand)

// Download attachments command (at root level)
program
  .command('download <id>')
  .alias('dl')
  .description('Download attachments from a note')
  .option('--all', 'Download all attachments')
  .option('--output <dir>', 'Output directory for downloaded files')
  .action(downloadCommand)

// Shorts commands
const shorts = program.command('shorts').alias('s')
shorts.description('Manage ephemeral shorts (auto-delete after TTL)')

shorts
  .command('add [content]')
  .alias('a')
  .description('Create a short from text, file, or stdin')
  .option('--ttl <value>', 'Time to live (e.g., 30s, 60m, 24h)', '24h')
  .action(addShort)

shorts
  .command('clip')
  .alias('c')
  .description('Create a short from clipboard content')
  .option('--ttl <value>', 'Time to live (e.g., 30s, 60m, 24h)', '24h')
  .action(clipShort)

shorts
  .command('file <path>')
  .alias('f')
  .description('Upload a file as an ephemeral short (max 150MB, 7 day TTL)')
  .option('--ttl <value>', 'Time to live (e.g., 1h, 24h, 168h)', '24h')
  .action(fileShort)

shorts
  .command('get <shortId>')
  .alias('g')
  .description('Get and display a short')
  .action(getShort)

shorts
  .command('ls')
  .aliases(['l', 'list'])
  .description('List all your shorts')
  .action(listShorts)

shorts
  .command('delete <shortId>')
  .aliases(['d', 'rm'])
  .description('Delete a short')
  .option('-f, --force', 'Skip confirmation')
  .action(deleteShort)

// Screenshot commands
const sc = program.command('sc')
sc.description('Screenshot capture and upload with TTL (macOS only)')

sc
  .command('capture', { isDefault: true })
  .description('Take a screenshot and upload')
  .option('--ttl <value>', 'Time to live (e.g., 30s, 60m, 24h)', '24h')
  .option('-w, --window', 'Capture a specific window')
  .option('-f, --fullscreen', 'Capture full screen')
  .action(captureScreenshot)

sc
  .command('c')
  .alias('clipboard')
  .description('Upload image from clipboard')
  .option('--ttl <value>', 'Time to live (e.g., 30s, 60m, 24h)', '24h')
  .action(clipboardScreenshot)

sc
  .command('get <screenshotId>')
  .alias('g')
  .description('Get screenshot download URL')
  .action(getScreenshot)

sc
  .command('ls')
  .aliases(['l', 'list'])
  .description('List all your screenshots')
  .action(listScreenshots)

sc
  .command('delete <screenshotId>')
  .aliases(['d', 'rm'])
  .description('Delete a screenshot')
  .option('-f, --force', 'Skip confirmation')
  .action(deleteScreenshot)

// Files commands (Pro subscription required)
const files = program.command('files').alias('f')
files.description('Persistent file storage with sharing (Pro subscription required)')

files
  .command('add <filepath>')
  .alias('a')
  .description('Upload a file (max 1GB, or 10GB with --tmp)')
  .option('-d, --description <text>', 'Optional description for the file')
  .option('-t, --tmp', 'Temporary file (auto-deletes in 24 hours, max 10GB)')
  .action(addFile)

files
  .command('ls')
  .aliases(['l', 'list'])
  .description('List all your files')
  .option('--limit <number>', 'Maximum number of files to return', '50')
  .option('--next-token <token>', 'Pagination token')
  .action(listFiles)

files
  .command('get <fileId>')
  .alias('g')
  .description('Download a file')
  .option('-o, --output <path>', 'Output file path')
  .option('-i, --info', 'Show file info and download URL only')
  .action(getFile)

files
  .command('delete <fileId>')
  .aliases(['d', 'rm'])
  .description('Delete a file and all its shares')
  .option('-f, --force', 'Skip confirmation')
  .action(deleteFile)

files
  .command('share <fileId>')
  .alias('sh')
  .description('Create a share link for a file')
  .option('--public', 'Create a public share (no password)')
  .option('--password <password>', 'Create a password-protected share')
  .option('--mar', 'Use miguelaramis.com domain for share URL')
  .option('--expires <days>', 'Share expiration in days (default: 30)')
  .action(shareFile)

files
  .command('unshare <fileId> <shareId>')
  .description('Revoke a share link')
  .option('-f, --force', 'Skip confirmation')
  .action(unshareFile)

files
  .command('shares <fileId>')
  .description('List all shares for a file')
  .action(listShares)

program.parse()
