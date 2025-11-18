# OIO CLI

A command-line interface tool for authenticating and managing your OIO platform account.

## Installation

```bash
npm install
npm link
```

This will make the `oio` command available globally on your system.

## Usage

### Authentication Commands

#### Login
Authenticate using the OAuth device flow:

```bash
oio auth login
```

This command will:
1. Prompt you for your OIO deployment base URL
2. Initiate the device authorization flow
3. Display a verification URL and user code
4. Automatically open your browser to complete authentication
5. Poll for authentication completion
6. Store your credentials locally

#### Logout
Clear all stored credentials:

```bash
oio auth logout
```

#### Check Current User
Display information about the currently authenticated user:

```bash
oio auth whoami
```

This shows:
- Base URL of your OIO deployment
- User information (ID, email, name, username)
- Token expiration status

## Configuration

The CLI stores configuration and credentials using the `conf` package. Configuration is stored in:
- macOS: `~/Library/Preferences/oio-nodejs/config.json`
- Linux: `~/.config/oio-nodejs/config.json`
- Windows: `%APPDATA%\oio-nodejs\Config\config.json`

Stored data includes:
- `baseurl`: Your OIO deployment URL
- `id_token`: OpenID Connect ID token
- `access_token`: OAuth access token
- `refresh_token`: OAuth refresh token

## Architecture

The CLI is built using:
- **commander**: Command-line interface framework
- **conf**: Configuration/credential storage
- **enquirer**: Interactive prompts
- **open**: Automatic browser opening
- **ora**: Loading spinners
- **undici**: HTTP client for API requests

### File Structure

```
oio/
├── cli.js                 # Main entry point
├── config.js             # Configuration schema and setup
├── commands/
│   ├── login.js          # Device flow authentication
│   ├── logout.js         # Credential clearing
│   └── whoami.js         # User information display
├── package.json
└── README.md
```

## Development

### Adding New Commands

To add a new command:

1. Create a new file in `commands/` directory
2. Export a default async function
3. Import and register it in `cli.js`

Example:

```javascript
// commands/example.js
import { config } from '../config.js'

export default async function example() {
  const accessToken = config.get('access_token')
  // Your command logic here
}
```

```javascript
// cli.js
import example from './commands/example.js'

auth
  .command('example')
  .description('Example command')
  .action(example)
```

## Error Handling

All commands include comprehensive error handling:
- Network errors
- Invalid credentials
- API errors
- Configuration issues

Errors are displayed with clear messages and appropriate exit codes.

## License

ISC
