# OIO CLI - Quick Start Guide

## Installation

1. Navigate to the oio directory:
```bash
cd oio
```

2. Install dependencies:
```bash
npm install
```

3. Link the CLI globally (optional):
```bash
npm link
```

Or run directly without linking:
```bash
node cli.js auth login
```

## First Time Setup

### Step 1: Login
```bash
oio auth login
```

You'll be prompted to:
1. Enter your OIO deployment base URL (e.g., `https://oio.example.com`)
2. The CLI will open your browser automatically
3. Complete the authentication in your browser
4. Return to the CLI - it will automatically detect when you've completed login

### Step 2: Verify Authentication
```bash
oio auth whoami
```

This displays:
- Your base URL
- User information (email, name, etc.)
- Token expiration status

## Common Usage

### Check if you're logged in
```bash
oio auth whoami
```

### Logout
```bash
oio auth logout
```

### Login to a different deployment
```bash
oio auth logout
oio auth login
# Enter new base URL when prompted
```

## Troubleshooting

### "Command not found: oio"
If you get this error after running `npm link`, try:
1. Run `npm unlink` then `npm link` again
2. Or use the full path: `node /path/to/oio/cli.js`
3. Or add an alias to your shell profile:
   ```bash
   alias oio='node /path/to/oio/cli.js'
   ```

### Browser doesn't open automatically
If the browser doesn't open:
1. Copy the verification URL shown in the terminal
2. Open it manually in your browser
3. Complete the authentication
4. The CLI will detect when you're done

### "You are not currently logged in"
Run `oio auth login` to authenticate.

### Token expired
If your token expires, simply run `oio auth login` again.

## Next Steps

The CLI is designed to be extensible. You can add new commands by:

1. Creating a new file in `commands/` directory
2. Exporting a default async function
3. Registering it in `cli.js`

See README.md for more details on extending the CLI.

## Getting Help

View all available commands:
```bash
oio --help
```

View help for auth commands:
```bash
oio auth --help
```
