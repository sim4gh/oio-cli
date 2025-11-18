#!/usr/bin/env node

import { program } from 'commander'
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
import { getShort } from './commands/shorts/get.js'
import { listShorts } from './commands/shorts/list.js'
import { deleteShort } from './commands/shorts/delete.js'

program
  .name('oio')
  .description('OIO CLI tool for authentication and management')
  .version('1.0.0')

// Auth commands
const auth = program
  .command('auth')
  .description('Authentication commands')

auth
  .command('login')
  .description('Login using device flow authentication')
  .action(login)

auth
  .command('logout')
  .description('Clear stored credentials and logout')
  .action(logout)

auth
  .command('whoami')
  .description('Show current user information')
  .action(whoami)

// Health command
program
  .command('health')
  .description('Check system health status')
  .action(healthCommand)

// Notes commands
const notes = program
  .command('notes')
  .description('Notes management commands')

notes
  .command('ls')
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
  .description('Delete a note by ID')
  .action(deleteCommand)

// List notes command (at root level - alias for 'notes ls')
program
  .command('ls')
  .description('List all notes')
  .option('--page <number>', 'Page number', '1')
  .action(listCommand)

// Download attachments command (at root level)
program
  .command('download <id>')
  .description('Download attachments from a note')
  .option('--all', 'Download all attachments')
  .option('--output <dir>', 'Output directory for downloaded files')
  .action(downloadCommand)

// Shorts commands
const shorts = program.command('shorts')
shorts.description('Manage ephemeral shorts (auto-delete after TTL)')

shorts
  .command('add [content]')
  .description('Create a short from text, file, or stdin')
  .option('--ttl <value>', 'Time to live (e.g., 30s, 60m, 24h)', '24h')
  .action(addShort)

shorts
  .command('clip')
  .description('Create a short from clipboard content')
  .option('--ttl <value>', 'Time to live (e.g., 30s, 60m, 24h)', '24h')
  .action(clipShort)

shorts
  .command('get <shortId>')
  .description('Get and display a short')
  .action(getShort)

shorts
  .command('ls')
  .alias('list')
  .description('List all your shorts')
  .action(listShorts)

shorts
  .command('delete <shortId>')
  .alias('rm')
  .description('Delete a short')
  .option('-f, --force', 'Skip confirmation')
  .action(deleteShort)

program.parse()
