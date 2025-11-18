import { apiRequest, handleApiError } from '../utils/api.js'

/**
 * Health check command
 * Checks the health status of the OIO service
 */
export async function healthCommand() {
  try {
    const response = await apiRequest('/health', {
      requireAuth: false
    })

    if (response.statusCode === 200) {
      console.log(`Status: ${response.body.status}`)
      console.log(`Message: ${response.body.message}`)
      console.log(`Timestamp: ${response.body.timestamp}`)
    } else {
      console.error(`Error: Health check failed with status ${response.statusCode}`)
      process.exit(1)
    }
  } catch (error) {
    handleApiError(error)
  }
}
