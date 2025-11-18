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

program.parse()
