import { setTimeout } from 'node:timers/promises'
import querystring from 'node:querystring'
import { request } from 'undici'
import open from 'open'
import ora from 'ora'
import { config } from '../config.js'

export default async function login() {
  try {
    // Use the configured base URL
    const baseurl = 'https://auth.yumaverse.com'

    // Step 1: Request device authorization
    const DEVICE_AUTH_URL = `${baseurl}/device_authorization`
    const deviceAuthResp = await request(DEVICE_AUTH_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'user-agent': 'oio'
      }
    })

    if (deviceAuthResp.statusCode !== 200) {
      console.error('Failed to initiate device authorization')
      process.exit(1)
    }

    const deviceAuthRespBody = await deviceAuthResp.body.json()

    // Step 2: Display verification URL and user code
    console.log('\nTo complete authentication, please visit:')
    console.log(`  ${deviceAuthRespBody.verification_uri_complete}`)
    console.log(`\nUser Code: ${deviceAuthRespBody.user_code}`)
    console.log('')

    try {
      // Open the browser automatically
      await open(deviceAuthRespBody.verification_uri_complete)
    } catch {
      // Silently fail if browser can't be opened
    }

    const spinner = ora('Waiting for you to complete the login in the browser...').start()

    // Step 3: Poll the token endpoint
    let loggedIn = null

    const TOKEN_URL = `${baseurl}/token`
    const tokenPayload = querystring.encode({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceAuthRespBody.device_code
    })
    const tokenHeaders = {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'oio'
    }

    while (!loggedIn) {
      // Wait for the polling interval
      await setTimeout(deviceAuthRespBody.interval * 1000)

      const tokenResp = await request(TOKEN_URL, {
        method: 'POST',
        headers: tokenHeaders,
        body: tokenPayload
      })
      const tokenRespBody = await tokenResp.body.json()

      if (tokenResp.statusCode === 200) {
        loggedIn = tokenRespBody
        spinner.succeed('Login successful!')
      } else if (tokenRespBody.error === 'authorization_pending' || tokenRespBody.error_code === 'authorization_pending') {
        // Continue polling
        continue
      } else if (tokenRespBody.error === 'slow_down') {
        // Increase polling interval if requested
        await setTimeout(5000)
      } else {
        // Other errors should stop the flow
        spinner.fail(`Login failed: ${tokenRespBody.error || tokenRespBody.error_code || 'Unknown error'}`)
        process.exit(1)
      }
    }

    // Step 4: Store credentials
    config.set('baseurl', baseurl)
    config.set('id_token', loggedIn.id_token)
    config.set('access_token', loggedIn.access_token)
    config.set('refresh_token', loggedIn.refresh_token)

    console.log('\nAuthentication complete! You are now logged in.')
  } catch (error) {
    console.error('\nAn error occurred during login:')
    console.error(error.message)
    process.exit(1)
  }
}
