import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createStudio } from '../utils/api'
import './Home.css'

function Home() {
  const [roomId, setRoomId] = useState('')
  const [studioName, setStudioName] = useState('')
  const [isCreatingStudio, setIsCreatingStudio] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleCreateRoom = () => {
    // Generate a random room ID
    const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    navigate(`/chat/${newRoomId}`)
  }

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/chat/${roomId.trim()}`)
    }
  }

  const handleCreateStudio = async () => {
    setIsCreatingStudio(true)
    setError(null)
    
    try {
      const name = studioName.trim() || `Studio ${new Date().toLocaleString()}`
      const studio = await createStudio(name)
      
      // Navigate to the lobby first (Green Room)
      navigate(`/studio/${studio.id}/lobby`)
    } catch (err) {
      setError(err.message || 'Failed to create studio')
      console.error('Error creating studio:', err)
    } finally {
      setIsCreatingStudio(false)
    }
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>Near</h1>
        <p className="subtitle">Studio Quality Recording & Live Chat</p>

        <div className="options">
          <div className="option-card">
            <h2>🎥 Recording Studio</h2>
            <p>Record high-quality video with progressive upload (solo)</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/studio')}
            >
              Go to Studio
            </button>
          </div>

          <div className="option-card">
            <h2>💬 Live Chat</h2>
            <p>1-to-1 video chat with WebRTC (no recording)</p>
            <div className="chat-actions">
              <button 
                className="btn btn-primary"
                onClick={handleCreateRoom}
              >
                Create Room
              </button>
              <div className="join-section">
                <input
                  type="text"
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  className="room-input"
                />
                <button 
                  className="btn btn-secondary"
                  onClick={handleJoinRoom}
                  disabled={!roomId.trim()}
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>

          <div className="option-card featured">
            <h2>🎬 Near Studio (Dual Stream)</h2>
            <p>Live video chat + High-quality recording simultaneously</p>
            <div className="chat-actions">
              <div className="create-studio-section">
                <input
                  type="text"
                  placeholder="Enter studio name (optional)"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="room-input"
                  onKeyPress={(e) => e.key === 'Enter' && !isCreatingStudio && handleCreateStudio()}
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleCreateStudio}
                  disabled={isCreatingStudio}
                >
                  {isCreatingStudio ? 'Creating...' : 'Create Studio'}
                </button>
              </div>
              {error && (
                <div className="error-message" style={{ color: '#f44336', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  {error}
                </div>
              )}
              <div className="join-section">
                <input
                  type="text"
                  placeholder="Enter studio ID to join"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && roomId.trim() && navigate(`/studio/${roomId.trim()}`)}
                  className="room-input"
                />
                <button 
                  className="btn btn-secondary"
                  onClick={() => roomId.trim() && navigate(`/studio/${roomId.trim()}/lobby`)}
                  disabled={!roomId.trim()}
                >
                  Join Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

