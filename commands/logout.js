import { config } from '../config.js'

export default async function logout() {
  try {
    const baseurl = config.get('baseurl')

    if (!baseurl) {
      console.log('You are not currently logged in.')
      return
    }

    // Clear all stored credentials
    config.clear()

    console.log('Successfully logged out. All credentials have been cleared.')
  } catch (error) {
    console.error('An error occurred during logout:')
    console.error(error.message)
    process.exit(1)
  }
}
