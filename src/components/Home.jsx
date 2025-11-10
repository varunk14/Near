import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const [roomId, setRoomId] = useState('')
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

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>Near</h1>
        <p className="subtitle">Studio Quality Recording & Live Chat</p>

        <div className="options">
          <div className="option-card">
            <h2>🎥 Recording Studio</h2>
            <p>Record high-quality video with progressive upload</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/studio')}
            >
              Go to Studio
            </button>
          </div>

          <div className="option-card">
            <h2>💬 Live Chat</h2>
            <p>1-to-1 video chat with WebRTC</p>
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
        </div>
      </div>
    </div>
  )
}

export default Home

