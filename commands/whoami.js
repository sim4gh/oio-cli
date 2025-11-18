import { request } from 'undici'
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

          // Check token expiration
          if (payload.exp) {
            const expirationDate = new Date(payload.exp * 1000)
            const now = new Date()
            const isExpired = expirationDate < now

            console.log(`\nToken Expiration: ${expirationDate.toLocaleString()}`)
            if (isExpired) {
              console.log('  Status: EXPIRED (you may need to login again)')
            } else {
              console.log('  Status: Valid')
            }
          }
        }
      } catch (parseError) {
        console.log('\nCould not parse token information')
      }
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
