import { request } from 'undici'
import { config } from '../config.js'

// Cognito configuration
const COGNITO_DOMAIN = 'oio-70676d07.auth.us-west-2.amazoncognito.com'
const CLIENT_ID = '5s958v222hp10p0qe86duks7ku'
const TOKEN_ENDPOINT = `https://${COGNITO_DOMAIN}/oauth2/token`

/**
 * Decode a JWT token and extract its payload
 * @param {string} token - The JWT token to decode
 * @returns {object|null} The decoded payload or null if invalid
 */
function decodeJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    const payload = Buffer.from(parts[1], 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

/**
 * Check if a token is expired
 * @param {string} token - The JWT token to check
 * @returns {boolean} True if the token is expired or invalid
 */
export function isTokenExpired(token) {
  if (!token) {
    return true
  }

  const payload = decodeJwt(token)
  if (!payload || !payload.exp) {
    return true
  }

  // Check if token expires in the next 60 seconds (add buffer)
  const expirationTime = payload.exp * 1000
  const now = Date.now()
  const buffer = 60 * 1000 // 60 seconds

  return expirationTime < (now + buffer)
}

/**
 * Refresh authentication tokens using the refresh token
 * @returns {Promise<object>} New tokens (id_token, access_token, and potentially refresh_token)
 * @throws {Error} If refresh fails
 */
export async function refreshTokens() {
  const refreshToken = config.get('refresh_token')

  if (!refreshToken) {
    throw new Error('No refresh token available. Please run "oio auth login" again.')
  }

  // Check if refresh token is expired
  if (isTokenExpired(refreshToken)) {
    throw new Error('Refresh token has expired. Please run "oio auth login" again.')
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: refreshToken
  })

  try {
    const response = await request(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    const body = await response.body.json()

    if (response.statusCode !== 200) {
      throw new Error(body.error_description || body.error || 'Failed to refresh tokens')
    }

    // Update stored tokens
    config.set('id_token', body.id_token)
    config.set('access_token', body.access_token)

    // Cognito may or may not return a new refresh token
    if (body.refresh_token) {
      config.set('refresh_token', body.refresh_token)
    }

    return {
      id_token: body.id_token,
      access_token: body.access_token,
      refresh_token: body.refresh_token || refreshToken
    }
  } catch (error) {
    if (error.message.includes('Failed to refresh tokens')) {
      throw error
    }
    throw new Error(`Token refresh failed: ${error.message}`)
  }
}
