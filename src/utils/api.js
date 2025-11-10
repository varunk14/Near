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

