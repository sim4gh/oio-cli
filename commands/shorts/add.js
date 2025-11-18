import { apiRequest, handleApiError } from '../../utils/api.js'
import { validateShortSize } from '../../utils/shorts-validator.js'
import { parseTTL } from '../../utils/ttl.js'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import ora from 'ora'

/**
 * Add short command
 * Creates a new short from stdin, file, or direct text
 * @param {string} content - Optional content text
 * @param {object} options - Command options
 */
export async function addShort(content, options) {
  try {
    let shortContent

    // Determine content source
    if (content) {
      // Check if content is a file path
      if (existsSync(content)) {
        // Read from file
        const spinner = ora('Reading file...').start()
        try {
          shortContent = await readFile(content, 'utf8')
          spinner.succeed('File read successfully')
        } catch (error) {
          spinner.fail('Failed to read file')
          throw error
        }
      } else {
        // Use as direct text
        shortContent = content
      }
    } else {
      // Read from stdin
      const spinner = ora('Reading from stdin...').start()
      try {
        const chunks = []
        for await (const chunk of process.stdin) {
          chunks.push(chunk)
        }
        shortContent = Buffer.concat(chunks).toString('utf8')
        spinner.succeed('Content read from stdin')
      } catch (error) {
        spinner.fail('Failed to read from stdin')
        throw error
      }
    }

    // Validate content
    try {
      validateShortSize(shortContent)
    } catch (error) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    // Parse and validate TTL
    let ttlSeconds
    try {
      ttlSeconds = parseTTL(options.ttl || '24h')
    } catch (error) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }

    // Create short via API
    const spinner = ora('Creating short...').start()

    const response = await apiRequest('/shorts', {
      method: 'POST',
      body: {
        content: shortContent,
        ttl: ttlSeconds
      }
    })

    if (response.statusCode === 201) {
      spinner.succeed('Short created successfully')
      console.log(`\nShort ID: ${response.body.shortId}`)
      console.log(`Expires: ${response.body.expiresAt ? new Date(response.body.expiresAt * 1000).toISOString() : 'N/A'}`)
    } else if (response.statusCode === 413) {
      spinner.fail('Content too large')
      console.error(`Error: ${response.body.message}`)
      process.exit(1)
    } else if (response.statusCode === 400) {
      spinner.fail('Invalid request')
      console.error(`Error: ${response.body.message}`)
      process.exit(1)
    } else {
      spinner.fail('Failed to create short')
      console.error(`Error: ${response.body.message || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
