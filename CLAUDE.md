# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OIO CLI is a Node.js command-line tool for interacting with the OIO platform. It provides authentication via OAuth device flow, notes management with file attachments, and ephemeral "shorts" content with TTL-based auto-deletion.

## Development Commands

### Setup
```bash
npm install          # Install dependencies
npm link            # Make 'oio' command globally available
```

### Running Without Install
```bash
node cli.js <command>    # Run CLI directly
```

### Testing Locally
The project currently has no automated tests. Test manually by:
1. Running `npm link` to install globally
2. Testing each command: `oio auth login`, `oio notes ls`, `oio shorts add`, etc.

### Homebrew Distribution
The CLI is distributed via Homebrew tap at https://github.com/sim4gh/homebrew-oio

**Installation for users:**
```bash
brew tap sim4gh/oio
brew install oio
```

**Releasing a new version:**
1. Update version in `package.json`
2. Create and push a git tag:
   ```bash
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin v1.0.1
   ```
3. Calculate the new SHA256:
   ```bash
   curl -sL https://github.com/sim4gh/oio-cli/archive/refs/tags/v1.0.1.tar.gz | shasum -a 256
   ```
4. Update `oio.rb` in the homebrew-oio repository:
   - Change `url` to point to new tag
   - Update `sha256` with the calculated value
   - Update version in `test do` block if needed
5. Commit and push to homebrew-oio repository

**Note:** The `oio.rb` file in this repository is the source formula, but the active formula used by Homebrew is in the separate `homebrew-oio` tap repository.

## Architecture

### Command Structure
The CLI uses Commander.js for command routing. Commands are organized hierarchically:
- **Root commands**: `add`, `get`, `upd`, `delete`, `ls`, `download`, `health`
- **Auth subcommands**: `auth login`, `auth logout`, `auth whoami`
- **Notes subcommands**: `notes ls` (aliased by root `ls`)
- **Shorts subcommands**: `shorts add`, `shorts clip`, `shorts get`, `shorts ls`, `shorts delete`

All commands are implemented as async functions in the `commands/` directory and registered in `cli.js`.

### Authentication Flow
1. **Device Flow OAuth**: Login command (`commands/login.js`) uses OAuth device authorization flow
   - Hardcoded auth URL: `https://auth.yumaverse.com`
   - User authenticates in browser while CLI polls token endpoint
   - Stores `id_token`, `access_token`, `refresh_token` in config

2. **Automatic Token Refresh**: All API requests (`utils/api.js`) automatically refresh expired tokens
   - `isTokenExpired()` checks if token expires within 60 seconds
   - `refreshTokens()` exchanges refresh_token for new tokens via Cognito
   - Cognito domain and client ID are hardcoded in `utils/refresh-token.js`

3. **Configuration Storage**: Uses `conf` package to store credentials
   - macOS: `~/Library/Preferences/oio-nodejs/config.json`
   - Linux: `~/.config/oio-nodejs/config.json`
   - Windows: `%APPDATA%\oio-nodejs\Config\config.json`

### API Request Pattern
All API calls use the `apiRequest()` utility (`utils/api.js`):
- Automatically adds `Authorization: Bearer <id_token>` header
- Checks for expired tokens and refreshes before making request
- Returns `{ statusCode, headers, body }` object
- Base URL comes from config (set during login)

### File Operations
- **Notes**: Support markdown file input via `--body` flag or interactive editor
  - `utils/editor.js`: Opens $EDITOR (defaults to vim) for content editing
  - `utils/file.js`: Handles file reading and size validation
  - `utils/file-upload.js`: Manages multipart/form-data attachment uploads

- **Shorts**: Support text, file path, or stdin input
  - `utils/ttl.js`: Parses TTL strings like "30s", "60m", "24h" into seconds
  - `utils/shorts-validator.js`: Validates content size limits

### Display Utilities
- `utils/table.js`: Formats notes list as CLI table
- `utils/shorts-table.js`: Formats shorts list as CLI table
- Uses `ora` for loading spinners throughout

## Adding New Commands

To add a new command:

1. Create command file in `commands/` (or subdirectory):
```javascript
// commands/example.js
import { apiRequest, handleApiError } from '../utils/api.js'

export async function exampleCommand(arg, options) {
  try {
    const response = await apiRequest('/endpoint', {
      method: 'POST',
      body: { data: arg }
    })

    console.log(`Result: ${response.body.result}`)
  } catch (error) {
    handleApiError(error)
  }
}
```

2. Register in `cli.js`:
```javascript
import { exampleCommand } from './commands/example.js'

program
  .command('example <arg>')
  .description('Example command description')
  .option('--flag', 'Optional flag')
  .action(exampleCommand)
```

## Important Implementation Details

### Token Management
- ID tokens are used for API authorization (not access tokens)
- Refresh happens automatically in `apiRequest()` before each API call
- Tokens are JWTs - decode by base64 decoding the middle segment

### Base URL Configuration
- Login command hardcodes `https://auth.yumaverse.com` for OAuth
- This URL is stored in config and used for all subsequent API calls
- API endpoints are relative paths (e.g., `/notes`, `/shorts`)

### Error Handling
- All commands should use `handleApiError()` for consistent error messages
- Use `ora` spinners to show loading state and success/failure
- Exit with `process.exit(1)` on errors

### HTTP Client
- Uses `undici` for all HTTP requests (both OAuth and API)
- Modern, performant alternative to `node-fetch` or `axios`
