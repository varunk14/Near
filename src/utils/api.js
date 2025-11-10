// API utility functions

// Auto-detect API URL from WebSocket URL or use environment variable
const getApiUrl = () => {
  // If explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Try to derive from WebSocket URL
  const wsUrl = import.meta.env.VITE_WS_URL
  if (wsUrl) {
    // Convert ws:// or wss:// to http:// or https://
    if (wsUrl.startsWith('ws://')) {
      return wsUrl.replace('ws://', 'http://')
    } else if (wsUrl.startsWith('wss://')) {
      return wsUrl.replace('wss://', 'https://')
    } else if (wsUrl.startsWith('https://')) {
      return wsUrl
    } else if (wsUrl.startsWith('http://')) {
      return wsUrl
    }
    // If no protocol, assume https:// for production
    return `https://${wsUrl}`
  }
  
  // Default for local development
  if (window.location.protocol === 'https:') {
    return 'https://localhost:3001'
  }
  return 'http://localhost:3001'
}

const API_URL = getApiUrl()

export async function createStudio(name) {
  try {
    const response = await fetch(`${API_URL}/api/create-studio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create studio')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating studio:', error)
    throw error
  }
}

export async function getStudio(id) {
  try {
    const response = await fetch(`${API_URL}/api/studio/${id}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch studio')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching studio:', error)
    throw error
  }
}

export async function createRecording(studio_id, recording_id, user_id, user_name) {
  try {
    const response = await fetch(`${API_URL}/api/recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studio_id,
        recording_id,
        user_id,
        user_name
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create recording')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating recording:', error)
    throw error
  }
}

export async function updateRecording(recording_id, file_path, status, completed_at) {
  try {
    const response = await fetch(`${API_URL}/api/recordings/${recording_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path,
        status,
        completed_at
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update recording')
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating recording:', error)
    throw error
  }
}

export async function getRecordings(studio_id = null) {
  try {
    const url = studio_id 
      ? `${API_URL}/api/recordings?studio_id=${studio_id}`
      : `${API_URL}/api/recordings`
    
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch recordings')
    }

    const data = await response.json()
    return data.recordings || []
  } catch (error) {
    console.error('Error fetching recordings:', error)
    throw error
  }
}

