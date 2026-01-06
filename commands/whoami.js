import { config } from '../config.js'

export default async function whoami() {
  try {
    const baseurl = config.get('baseurl')
    const accessToken = config.get('access_token')
    const idToken = config.get('id_token')

    if (!baseurl || !accessToken) {
      console.log('You are not currently logged in.')
      console.log('Run "oio auth login" to authenticate.')
      process.exit(1)
    }

    console.log('\nCurrent Authentication Status:')
    console.log('------------------------------')
    console.log(`Base URL: ${baseurl}`)

    // Decode and display ID token payload if available
    if (idToken) {
      try {
        // ID tokens are JWTs with format: header.payload.signature
        const parts = idToken.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

          console.log('\nUser Information:')
          if (payload.sub) console.log(`  User ID: ${payload.sub}`)
          if (payload.email) console.log(`  Email: ${payload.email}`)
          if (payload.name) console.log(`  Name: ${payload.name}`)
          if (payload.preferred_username) console.log(`  Username: ${payload.preferred_username}`)

        }
      } catch (parseError) {
        console.log('\nCould not parse token information')
      }
    }

    // Show session expiration based on refresh token validity (365 days from login)
    const loggedInAt = config.get('logged_in_at')
    if (loggedInAt) {
      const loginDate = new Date(loggedInAt)
      const sessionExpiry = new Date(loginDate)
      sessionExpiry.setDate(sessionExpiry.getDate() + 365)

      const now = new Date()
      const daysRemaining = Math.ceil((sessionExpiry - now) / (1000 * 60 * 60 * 24))

      console.log('\nSession Information:')
      console.log(`  Logged in: ${loginDate.toLocaleString()}`)
      console.log(`  Session expires: ${sessionExpiry.toLocaleString()}`)
      if (daysRemaining > 0) {
        console.log(`  Status: Valid (${daysRemaining} days remaining)`)
      } else {
        console.log('  Status: EXPIRED (please login again)')
      }
    } else {
      // Fallback for users who logged in before this update
      console.log('\nSession Information:')
      console.log('  Session expires: ~1 year from login')
      console.log('  (Re-login to see exact expiration date)')
    }

    // Optionally: Try to call a userinfo endpoint if available
    // This is commented out but can be enabled if the OIO platform has a userinfo endpoint
    /*
    try {
      const userinfoResp = await request(`${baseurl}/auth/userinfo`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/json',
          'user-agent': 'oio'
        }
      })

      if (userinfoResp.statusCode === 200) {
        const userinfo = await userinfoResp.body.json()
        console.log('\nUser Information from API:')
        console.log(JSON.stringify(userinfo, null, 2))
      }
    } catch (error) {
      // Silently fail if userinfo endpoint doesn't exist
    }
    */

    console.log('')
  } catch (error) {
    console.error('\nAn error occurred:')
    console.error(error.message)
    process.exit(1)
  }
}
