import { request } from 'undici'
import { config } from '../config.js'
import { readFile } from 'fs/promises'
import { writeFile } from 'fs/promises'
import mime from 'mime-types'

/**
 * Upload an attachment to a note
 * @param {string} noteId - Note ID
 * @param {string} filePath - Path to file to upload
 * @param {string} fileName - Original file name
 * @returns {Promise<object>} Response object with statusCode, headers, body
 */
export async function uploadAttachment(noteId, filePath, fileName) {
  const baseUrl = config.get('baseurl')
  if (!baseUrl) {
    throw new Error('Not configured. Please run "oio auth login" first.')
  }

  const idToken = config.get('id_token')
  if (!idToken) {
    throw new Error('Not authenticated. Please run "oio auth login" first.')
  }

  const url = `${baseUrl}/notes/${noteId}/attachments`

  // Read file and encode as base64
  const fileBuffer = await readFile(filePath)
  const base64Data = fileBuffer.toString('base64')
  const contentType = mime.lookup(fileName) || 'application/octet-stream'

  try {
    const response = await request(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        fileName,
        contentType,
        data: base64Data
      })
    })

    const body = await response.body.json()

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
 * List attachments for a note
 * @param {string} noteId - Note ID
 * @returns {Promise<object>} Response object with statusCode, headers, body
 */
export async function listAttachments(noteId) {
  const baseUrl = config.get('baseurl')
  if (!baseUrl) {
    throw new Error('Not configured. Please run "oio auth login" first.')
  }

  const idToken = config.get('id_token')
  if (!idToken) {
    throw new Error('Not authenticated. Please run "oio auth login" first.')
  }

  const url = `${baseUrl}/notes/${noteId}/attachments`

  try {
    const response = await request(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${idToken}`
      }
    })

    const body = await response.body.json()

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
 * Get download URL for an attachment
 * @param {string} noteId - Note ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<object>} Response object with statusCode, headers, body
 */
export async function getAttachmentDownloadUrl(noteId, attachmentId) {
  const baseUrl = config.get('baseurl')
  if (!baseUrl) {
    throw new Error('Not configured. Please run "oio auth login" first.')
  }

  const idToken = config.get('id_token')
  if (!idToken) {
    throw new Error('Not authenticated. Please run "oio auth login" first.')
  }

  const url = `${baseUrl}/notes/${noteId}/attachments/${attachmentId}`

  try {
    const response = await request(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${idToken}`
      }
    })

    const body = await response.body.json()

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
 * Download an attachment file
 * @param {string} downloadUrl - Pre-signed S3 URL
 * @param {string} outputPath - Path to save the file
 * @returns {Promise<void>}
 */
export async function downloadAttachmentFile(downloadUrl, outputPath) {
  try {
    const response = await request(downloadUrl, {
      method: 'GET'
    })

    // Read the binary data
    const buffer = await response.body.arrayBuffer()

    // Write to file
    await writeFile(outputPath, Buffer.from(buffer))
  } catch (error) {
    throw new Error(`Failed to download file: ${error.message}`)
  }
}

/**
 * Delete an attachment
 * @param {string} noteId - Note ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<object>} Response object with statusCode, headers, body
 */
export async function deleteAttachment(noteId, attachmentId) {
  const baseUrl = config.get('baseurl')
  if (!baseUrl) {
    throw new Error('Not configured. Please run "oio auth login" first.')
  }

  const idToken = config.get('id_token')
  if (!idToken) {
    throw new Error('Not authenticated. Please run "oio auth login" first.')
  }

  const url = `${baseUrl}/notes/${noteId}/attachments/${attachmentId}`

  try {
    const response = await request(url, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${idToken}`
      }
    })

    const body = await response.body.json()

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
