import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { uploadToR2 } from '../utils/r2Upload'
import { getStudio } from '../utils/api'
import './DualStream.css'

// Get WebSocket URL from environment or use default
const getWebSocketUrl = () => {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) {
    if (envUrl.startsWith('http://')) {
      return envUrl.replace('http://', 'ws://')
    } else if (envUrl.startsWith('https://')) {
      return envUrl.replace('https://', 'wss://')
    } else if (envUrl.startsWith('ws://') || envUrl.startsWith('wss://')) {
      return envUrl
    }
    return `wss://${envUrl}`
  }
  
  if (window.location.protocol === 'https:') {
    return 'wss://localhost:3001'
  }
  return 'ws://localhost:3001'
}

const WS_URL = getWebSocketUrl()

// Remote Video Component
function RemoteVideo({ userId, stream, connectionState, userName }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="video-wrapper">
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="video-preview remote-video"
          />
          <div className="video-label">
            {userName || `User ${userId.substring(0, 8)}`}
            {connectionState && connectionState !== 'connected' && (
              <span className="connection-badge">{connectionState}</span>
            )}
          </div>
        </>
      ) : (
        <div className="waiting-message">
          <p>Connecting to {userName || userId.substring(0, 8)}...</p>
        </div>
      )}
    </div>
  )
}

function DualStream() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState(null)
  const [remoteUsers, setRemoteUsers] = useState(new Map()) // userId -> { stream, connectionState, name }
  const [uploadedChunks, setUploadedChunks] = useState(0)
  const [studioName, setStudioName] = useState(null)
  const [userName, setUserName] = useState('')
  
  const localVideoRef = useRef(null)
  const wsRef = useRef(null)
  const peerConnectionsRef = useRef(new Map()) // userId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()) // userId -> MediaStream
  const localStreamRef = useRef(null) // High-quality stream for recording
  const webRTCStreamRef = useRef(null) // Lower-quality stream for WebRTC
  const userIdRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingIdRef = useRef(null)
  const chunkCounterRef = useRef(0)
  const pendingUploadsRef = useRef(new Set())
  const uploadedChunksCountRef = useRef(0)

  // WebRTC configuration with TURN servers (Open Relay Project - free tier)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Open Relay Project free TURN servers
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }

  useEffect(() => {
    // Get device IDs and name from URL params (from lobby)
    const cameraId = searchParams.get('camera')
    const micId = searchParams.get('mic')
    const name = searchParams.get('name')
    
    if (name) {
      setUserName(name)
    }

    // Fetch studio information
    const fetchStudio = async () => {
      if (roomId) {
        try {
          const studio = await getStudio(roomId)
          if (studio) {
            setStudioName(studio.name)
          }
        } catch (err) {
          console.warn('Could not fetch studio info:', err)
          // Continue anyway - studio might not exist in DB yet
        }
      }
    }

    fetchStudio()
    initializeConnection(cameraId, micId)

    return () => {
      cleanup()
    }
  }, [roomId, searchParams])

  const initializeConnection = async (cameraId, micId) => {
    try {
      // Build constraints with selected devices (from lobby)
      const videoConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      }
      
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000
      }
      
      // Use selected device IDs if provided
      if (cameraId) {
        videoConstraints.deviceId = { exact: cameraId }
      }
      if (micId) {
        audioConstraints.deviceId = { exact: micId }
      }
      
      // Get high-quality stream for recording with selected devices
      const highQualityStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      })

      localStreamRef.current = highQualityStream
      
      // Use the same stream for both WebRTC and recording
      // MediaRecorder will record at high quality, WebRTC will negotiate its own quality
      // This is the "Dual Stream" approach - same source, different quality handling
      webRTCStreamRef.current = highQualityStream
      
      // Display high-quality stream in local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = highQualityStream
      }

      // Ensure all tracks are enabled
      highQualityStream.getTracks().forEach(track => {
        track.enabled = true
      })

      console.log('Streams initialized:', {
        recording: { video: highQualityStream.getVideoTracks().length, audio: highQualityStream.getAudioTracks().length },
        webrtc: { video: webRTCStreamRef.current.getVideoTracks().length, audio: webRTCStreamRef.current.getAudioTracks().length }
      })

      // Connect to signaling server
      await connectWebSocket()
    } catch (err) {
      setError(`Error accessing media devices: ${err.message}`)
      console.error('Error accessing media devices:', err)
    }
  }

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        
        userIdRef.current = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId: roomId || 'default',
          userId: userIdRef.current,
          userName: userName || null
        }))
        
        resolve()
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        await handleSignalingMessage(data)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('WebSocket connection error')
        reject(error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
      }
    })
  }

  const handleSignalingMessage = async (data) => {
    try {
      switch (data.type) {
        case 'joined':
          console.log('Joined room:', data.roomId, 'Existing users:', data.existingUsers)
          // Create peer connections for all existing users (mesh architecture)
          if (data.existingUsers && data.existingUsers.length > 0) {
            for (const existingUserId of data.existingUsers) {
              await createPeerConnectionForUser(existingUserId)
              await createOfferForUser(existingUserId)
              
              // Store user names if provided
              if (data.existingUsersWithNames) {
                const userInfo = data.existingUsersWithNames.find(u => u.userId === existingUserId)
                if (userInfo && userInfo.userName) {
                  setRemoteUsers(prev => {
                    const newMap = new Map(prev)
                    const existing = newMap.get(existingUserId) || {}
                    newMap.set(existingUserId, { ...existing, name: userInfo.userName })
                    return newMap
                  })
                }
              }
            }
          }
          break

        case 'user-joined':
          console.log('User joined:', data.userId, data.userName || 'unnamed')
          // Create peer connection for the new user
          await createPeerConnectionForUser(data.userId)
          await createOfferForUser(data.userId)
          // Store user name
          if (data.userName) {
            setRemoteUsers(prev => {
              const newMap = new Map(prev)
              const existing = newMap.get(data.userId) || {}
              newMap.set(data.userId, { ...existing, name: data.userName })
              return newMap
            })
          }
          break

        case 'offer':
          console.log('Received offer from:', data.from)
          await handleOffer(data.offer, data.from)
          break

        case 'answer':
          console.log('Received answer from:', data.from)
          await handleAnswer(data.answer, data.from)
          break

        case 'ice-candidate':
          console.log('Received ICE candidate from:', data.from)
          await handleIceCandidate(data.candidate, data.from)
          break

        case 'user-left':
          console.log('User left:', data.userId)
          removePeerConnection(data.userId)
          break

        case 'error':
          setError(data.message)
          break

        default:
          console.log('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Error handling signaling message:', error)
      setError(`Error: ${error.message}`)
    }
  }

  const addLocalTracksToPeerConnection = (pc) => {
    if (!webRTCStreamRef.current || !pc) {
      console.warn('Cannot add tracks: stream or peer connection not available')
      return
    }
    
    const existingSenders = pc.getSenders()
    const hasVideoTrack = existingSenders.some(sender => 
      sender.track && sender.track.kind === 'video' && sender.track.enabled
    )
    const hasAudioTrack = existingSenders.some(sender => 
      sender.track && sender.track.kind === 'audio' && sender.track.enabled
    )
    
    if (!hasVideoTrack) {
      const videoTrack = webRTCStreamRef.current.getVideoTracks()[0]
      if (videoTrack && videoTrack.enabled) {
        try {
          pc.addTrack(videoTrack, webRTCStreamRef.current)
          console.log('✅ Added video track to peer connection (low quality for chat)')
        } catch (error) {
          console.error('Error adding video track:', error)
        }
      }
    }
    
    if (!hasAudioTrack) {
      const audioTrack = webRTCStreamRef.current.getAudioTracks()[0]
      if (audioTrack && audioTrack.enabled) {
        try {
          pc.addTrack(audioTrack, webRTCStreamRef.current)
          console.log('✅ Added audio track to peer connection')
        } catch (error) {
          console.error('Error adding audio track:', error)
        }
      }
    }
  }

  const createPeerConnectionForUser = (targetUserId) => {
    // Don't create duplicate connections
    if (peerConnectionsRef.current.has(targetUserId)) {
      console.log(`Peer connection already exists for ${targetUserId}`)
      return
    }

    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionsRef.current.set(targetUserId, pc)

    addLocalTracksToPeerConnection(pc)

    pc.ontrack = (event) => {
      console.log(`Received remote stream from ${targetUserId}`)
      const stream = event.streams[0]
      remoteStreamsRef.current.set(targetUserId, stream)
      
      // Update state to trigger re-render
      setRemoteUsers(prev => {
        const newMap = new Map(prev)
        newMap.set(targetUserId, { stream, connectionState: pc.connectionState })
        return newMap
      })
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: targetUserId, // Send to specific user
          roomId: roomId || 'default'
        }))
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetUserId}:`, pc.connectionState)
      
      // Update state
      setRemoteUsers(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(targetUserId) || {}
        newMap.set(targetUserId, { ...existing, connectionState: pc.connectionState })
        return newMap
      })
      
      if (pc.connectionState === 'failed') {
        console.error(`Peer connection failed with ${targetUserId}`)
      }
    }
  }

  const createOfferForUser = async (targetUserId) => {
    let pc = peerConnectionsRef.current.get(targetUserId)
    
    if (!pc) {
      createPeerConnectionForUser(targetUserId)
      pc = peerConnectionsRef.current.get(targetUserId)
    }

    try {
      addLocalTracksToPeerConnection(pc)
      
      if (pc.signalingState !== 'stable') {
        console.log(`Cannot create offer for ${targetUserId}, connection state:`, pc.signalingState)
        return
      }
      
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log(`Created and set local offer for ${targetUserId}`)

      wsRef.current?.send(JSON.stringify({
        type: 'offer',
        offer: offer,
        to: targetUserId, // Send to specific user
        roomId: roomId || 'default'
      }))
    } catch (error) {
      console.error(`Error creating offer for ${targetUserId}:`, error)
      setError(`Error creating offer: ${error.message}`)
    }
  }

  const handleOffer = async (offer, fromUserId) => {
    let pc = peerConnectionsRef.current.get(fromUserId)
    
    if (!pc) {
      createPeerConnectionForUser(fromUserId)
      pc = peerConnectionsRef.current.get(fromUserId)
    }

    try {
      addLocalTracksToPeerConnection(pc)
      
      if (pc.signalingState === 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        wsRef.current?.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          to: fromUserId, // Send to specific user
          roomId: roomId || 'default'
        }))
      }
    } catch (error) {
      console.error(`Error handling offer from ${fromUserId}:`, error)
      setError(`Error handling offer: ${error.message}`)
    }
  }

  const handleAnswer = async (answer, fromUserId) => {
    const pc = peerConnectionsRef.current.get(fromUserId)
    if (!pc) return

    try {
      const currentState = pc.signalingState
      
      if (currentState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log(`Successfully set remote answer from ${fromUserId}`)
      } else if (currentState === 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (e) {
          console.warn(`Could not set remote answer from ${fromUserId} (connection already established):`, e.message)
        }
      }
    } catch (error) {
      console.error(`Error handling answer from ${fromUserId}:`, error)
      if (!error.message.includes('stable')) {
        setError(`Error handling answer: ${error.message}`)
      }
    }
  }

  const handleIceCandidate = async (candidate, fromUserId) => {
    const pc = peerConnectionsRef.current.get(fromUserId)
    if (!pc) return

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error(`Error adding ICE candidate from ${fromUserId}:`, error)
    }
  }

  const removePeerConnection = (userId) => {
    const pc = peerConnectionsRef.current.get(userId)
    if (pc) {
      pc.close()
      peerConnectionsRef.current.delete(userId)
    }
    
    remoteStreamsRef.current.delete(userId)
    
    setRemoteUsers(prev => {
      const newMap = new Map(prev)
      newMap.delete(userId)
      return newMap
    })
  }

  const startRecording = () => {
    if (!localStreamRef.current) {
      setError('No media stream available for recording')
      return
    }

    try {
      recordingIdRef.current = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      chunkCounterRef.current = 0
      uploadedChunksCountRef.current = 0
      setUploadedChunks(0)
      pendingUploadsRef.current.clear()
      
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps for high quality
      }

      let mediaRecorder
      try {
        mediaRecorder = new MediaRecorder(localStreamRef.current, options)
      } catch (e) {
        console.warn('Preferred codec not supported, using default:', e)
        mediaRecorder = new MediaRecorder(localStreamRef.current)
      }

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          const chunkNumber = chunkCounterRef.current++
          await handleChunkUpload(event.data, chunkNumber)
        }
      }

      mediaRecorder.onstop = async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.requestData()
        }
        
        while (pendingUploadsRef.current.size > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        setUploadStatus(`Recording complete! Uploaded ${uploadedChunksCountRef.current} chunk${uploadedChunksCountRef.current !== 1 ? 's' : ''}.`)
        setIsUploading(false)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(10000) // 10-second chunks
      setIsRecording(true)
      setUploadStatus('Recording started. Chunks uploading every 10 seconds...')
      setError(null)
    } catch (err) {
      setError(`Error starting recording: ${err.message}`)
      console.error('Error starting recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsUploading(true)
      setUploadStatus('Stopping recording and uploading final chunk...')
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleChunkUpload = async (chunkBlob, chunkNumber) => {
    if (!recordingIdRef.current) return

    const uploadId = `${recordingIdRef.current}_chunk_${chunkNumber}`
    pendingUploadsRef.current.add(uploadId)
    setIsUploading(true)

    try {
      const chunkFilename = `${recordingIdRef.current}_chunk_${String(chunkNumber).padStart(3, '0')}.webm`
      await uploadToR2(chunkBlob, chunkFilename)
      
      uploadedChunksCountRef.current += 1
      setUploadedChunks(uploadedChunksCountRef.current)
      setUploadStatus(`Uploaded chunk ${chunkNumber + 1}...`)
      
      console.log(`Successfully uploaded chunk ${chunkNumber}: ${chunkFilename}`)
    } catch (err) {
      console.error(`Error uploading chunk ${chunkNumber}:`, err)
      setError(`Failed to upload chunk ${chunkNumber + 1}: ${err.message}`)
    } finally {
      pendingUploadsRef.current.delete(uploadId)
      if (pendingUploadsRef.current.size === 0 && !isRecording) {
        setIsUploading(false)
      }
    }
  }

  const cleanup = () => {
    // Stop local streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (webRTCStreamRef.current) {
      webRTCStreamRef.current.getTracks().forEach(track => track.stop())
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, userId) => {
      pc.close()
    })
    peerConnectionsRef.current.clear()
    remoteStreamsRef.current.clear()
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    // Clear remote users
    setRemoteUsers(new Map())
  }

  return (
    <div className="dual-stream-container">
      <div className="chat-header">
        <h2>
          {studioName ? studioName : 'Near Studio'} 
          {roomId && <span className="room-id">({roomId.substring(0, 8)}...)</span>}
        </h2>
        <div className="header-controls">
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
          {remoteUsers.size > 0 && (
            <div className="user-count">
              {remoteUsers.size} {remoteUsers.size === 1 ? 'user' : 'users'} connected
            </div>
          )}
          {isRecording && (
            <div className="recording-badge">
              <span className="recording-dot"></span>
              Recording
            </div>
          )}
        </div>
      </div>

      <div className="video-grid">
        <div className="video-wrapper">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-preview local-video"
          />
          <div className="video-label">
            {userName || 'You'} (High Quality)
          </div>
        </div>

        {Array.from(remoteUsers.entries()).map(([userId, userData]) => (
          <RemoteVideo
            key={userId}
            userId={userId}
            stream={userData.stream}
            connectionState={userData.connectionState}
            userName={userData.name}
          />
        ))}

        {remoteUsers.size === 0 && (
          <div className="video-wrapper">
            <div className="waiting-message">
              <p>Waiting for other users to join...</p>
              <p className="waiting-subtitle">Up to 4 users can join this studio</p>
            </div>
          </div>
        )}
      </div>

      <div className="controls-section">
        <div className="recording-controls">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="btn btn-record"
              disabled={isUploading || !localStreamRef.current}
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="btn btn-stop"
            >
              Stop Recording
            </button>
          )}
        </div>

        {isRecording && (
          <div className="recording-status">
            {uploadedChunks > 0 
              ? `Recording... ${uploadedChunks} chunk${uploadedChunks !== 1 ? 's' : ''} uploaded`
              : 'Recording... Waiting for first chunk...'}
          </div>
        )}
      </div>

      {uploadStatus && (
        <div className="status status-success">
          {uploadStatus}
        </div>
      )}

      {error && (
        <div className="status status-error">
          {error}
        </div>
      )}

      {isUploading && !isRecording && (
        <div className="status status-info">
          Uploading final chunks... Please wait.
        </div>
      )}
    </div>
  )
}

export default DualStream

