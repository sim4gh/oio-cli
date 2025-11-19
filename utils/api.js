import { request } from 'undici'
import { config } from '../config.js'
import { isTokenExpired, refreshTokens } from './refresh-token.js'

/**
 * Make an authenticated API request
 * @param {string} path - API path (e.g., '/health', '/notes')
 * @param {object} options - Request options (method, body, headers)
 * @returns {Promise<object>} Response object with statusCode, headers, body
 */
export async function apiRequest(path, options = {}) {
  const baseUrl = config.get('baseurl')
  if (!baseUrl) {
    throw new Error('Not configured. Please run "oio auth login" first.')
  }

  let idToken = config.get('id_token')
  if (!idToken && options.requireAuth !== false) {
    throw new Error('Not authenticated. Please run "oio auth login" first.')
  }

  // Check if ID token is expired and refresh if needed
  if (idToken && options.requireAuth !== false && isTokenExpired(idToken)) {
    try {
      const tokens = await refreshTokens()
      idToken = tokens.id_token
    } catch (error) {
      throw new Error(`Authentication expired: ${error.message}`)
    }
  }

  const url = `${baseUrl}${path}`
  const headers = {
    'content-type': 'application/json',
    ...options.headers
  }

  // Add Authorization header if authenticated and required
  if (idToken && options.requireAuth !== false) {
    headers.authorization = `Bearer ${idToken}`
  }

  const requestOptions = {
    method: options.method || 'GET',
    headers
  }

  if (options.body) {
    requestOptions.body = JSON.stringify(options.body)
  }

  try {
    const response = await request(url, requestOptions)

    // Don't try to parse JSON for 204 No Content responses
    let body = null
    if (response.statusCode !== 204) {
      body = await response.body.json()
    }

    return {
      statusCode: response.statusCode,
      headers: response.headers,
      body
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Unable to connect to API at ${baseUrl}`)
    }
    throw error
  }
}

/**
 * Handle API errors and display user-friendly messages
 * @param {Error} error - The error to handle
 */
export function handleApiError(error) {
  if (error.message.includes('Not configured') || error.message.includes('Not authenticated')) {
    console.error(`Error: ${error.message}`)
  } else if (error.message.includes('Unable to connect')) {
    console.error(`Error: ${error.message}`)
  } else {
    console.error(`Error: ${error.message}`)
  }
  process.exit(1)
}
