import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './Lobby.css'

function Lobby() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  
  const [devices, setDevices] = useState({ cameras: [], microphones: [] })
  const [selectedCamera, setSelectedCamera] = useState('')
  const [selectedMicrophone, setSelectedMicrophone] = useState('')
  const [userName, setUserName] = useState('')
  const [previewStream, setPreviewStream] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const videoRef = useRef(null)

  useEffect(() => {
    enumerateDevices()
    return () => {
      // Cleanup preview stream
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    // Update preview when device selection changes (but not on initial mount)
    if (!isLoading && (selectedCamera || selectedMicrophone)) {
      updatePreview()
    }
  }, [selectedCamera, selectedMicrophone, isLoading])

  const enumerateDevices = async () => {
    try {
      // Request permission first (required for device labels)
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      
      // Enumerate all devices
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      
      const cameras = deviceList.filter(device => device.kind === 'videoinput')
      const microphones = deviceList.filter(device => device.kind === 'audioinput')
      
      setDevices({ cameras, microphones })
      
      // Set default selections and start preview
      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId)
      }
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId)
      }
      
      setIsLoading(false)
      
      // Start preview with default devices
      if (cameras.length > 0 || microphones.length > 0) {
        setTimeout(() => {
          updatePreview()
        }, 100)
      }
    } catch (err) {
      setError(`Error accessing devices: ${err.message}`)
      setIsLoading(false)
      console.error('Error enumerating devices:', err)
    }
  }

  const updatePreview = async () => {
    try {
      // Stop existing preview
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setPreviewStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error updating preview:', err)
      setError(`Error previewing device: ${err.message}`)
    }
  }

  const handleJoinStudio = () => {
    // Stop preview stream
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop())
    }

    // Navigate to studio with device IDs and name as URL params or state
    const params = new URLSearchParams()
    if (selectedCamera) params.set('camera', selectedCamera)
    if (selectedMicrophone) params.set('mic', selectedMicrophone)
    if (userName.trim()) params.set('name', userName.trim())
    
    navigate(`/studio/${roomId}?${params.toString()}`)
  }

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1>Green Room</h1>
        <p className="lobby-subtitle">Check your devices before joining the studio</p>

        {error && (
          <div className="status status-error">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="loading-message">
            <p>Loading devices...</p>
          </div>
        ) : (
          <>
            <div className="lobby-content">
              <div className="preview-section">
                <h3>Preview</h3>
                <div className="video-preview-wrapper">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="preview-video"
                  />
                  {!previewStream && (
                    <div className="preview-placeholder">
                      <p>Select devices to see preview</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <div className="setting-group">
                  <label htmlFor="user-name">Your Name (Optional)</label>
                  <input
                    id="user-name"
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="name-input"
                    maxLength={50}
                  />
                </div>

                <div className="setting-group">
                  <label htmlFor="camera-select">Camera</label>
                  <select
                    id="camera-select"
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="device-select"
                  >
                    {devices.cameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${devices.cameras.indexOf(camera) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="setting-group">
                  <label htmlFor="microphone-select">Microphone</label>
                  <select
                    id="microphone-select"
                    value={selectedMicrophone}
                    onChange={(e) => setSelectedMicrophone(e.target.value)}
                    className="device-select"
                  >
                    {devices.microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone ${devices.microphones.indexOf(mic) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="lobby-actions">
              <button
                onClick={handleJoinStudio}
                className="btn btn-join"
                disabled={!selectedCamera || !selectedMicrophone}
              >
                Join Studio
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Lobby

