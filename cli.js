#!/usr/bin/env node

import { program } from 'commander'
import login from './commands/login.js'
import logout from './commands/logout.js'
import whoami from './commands/whoami.js'

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

program.parse()
