// API utility functions

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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

