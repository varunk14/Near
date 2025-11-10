import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './LiveChat.css'

// Get WebSocket URL from environment or use default
// Automatically use wss:// for HTTPS sites, ws:// for localhost
const getWebSocketUrl = () => {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) {
    // If URL starts with http:// or https://, convert to ws:// or wss://
    if (envUrl.startsWith('http://')) {
      return envUrl.replace('http://', 'ws://')
    } else if (envUrl.startsWith('https://')) {
      return envUrl.replace('https://', 'wss://')
    } else if (envUrl.startsWith('ws://') || envUrl.startsWith('wss://')) {
      return envUrl
    }
    // If no protocol, assume wss:// for production
    return `wss://${envUrl}`
  }
  
  // Default: use ws:// for localhost, wss:// for production
  if (window.location.protocol === 'https:') {
    return 'wss://localhost:3001' // For local HTTPS testing
  }
  return 'ws://localhost:3001' // Default local development
}

const WS_URL = getWebSocketUrl()

function LiveChat() {
  const { roomId } = useParams()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [remoteUserId, setRemoteUserId] = useState(null)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const wsRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const userIdRef = useRef(null)

  // WebRTC configuration (using STUN servers, TURN will be added in MVP 6)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  useEffect(() => {
    initializeConnection()

    return () => {
      cleanup()
    }
  }, [roomId])

  const initializeConnection = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      localStreamRef.current = stream
      
      // Ensure all tracks are enabled
      stream.getTracks().forEach(track => {
        track.enabled = true
        console.log(`Track enabled: ${track.kind} - ${track.enabled ? 'enabled' : 'disabled'}`)
      })
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      console.log('Local stream initialized with tracks:', {
        video: stream.getVideoTracks().length,
        audio: stream.getAudioTracks().length
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
        
        // Generate user ID
        userIdRef.current = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Join room
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId: roomId || 'default',
          userId: userIdRef.current
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
          console.log('Joined room:', data.roomId)
          // Create peer connection
          createPeerConnection()
          break

        case 'user-joined':
          console.log('User joined:', data.userId)
          setRemoteUserId(data.userId)
          // Create offer if we're the first user
          await createOffer()
          break

        case 'offer':
          console.log('Received offer from:', data.from)
          setRemoteUserId(data.from)
          await handleOffer(data.offer)
          break

        case 'answer':
          console.log('Received answer from:', data.from)
          await handleAnswer(data.answer)
          break

        case 'ice-candidate':
          console.log('Received ICE candidate from:', data.from)
          await handleIceCandidate(data.candidate)
          break

        case 'user-left':
          console.log('User left:', data.userId)
          setRemoteUserId(null)
          // Clean up peer connection
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
          }
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
    if (!localStreamRef.current || !pc) {
      console.warn('Cannot add tracks: stream or peer connection not available')
      return
    }
    
    // Check if tracks are already added
    const existingSenders = pc.getSenders()
    const hasVideoTrack = existingSenders.some(sender => 
      sender.track && sender.track.kind === 'video' && sender.track.enabled
    )
    const hasAudioTrack = existingSenders.some(sender => 
      sender.track && sender.track.kind === 'audio' && sender.track.enabled
    )
    
    console.log('Current senders:', {
      total: existingSenders.length,
      hasVideo: hasVideoTrack,
      hasAudio: hasAudioTrack
    })
    
    // Add video track if not already added
    if (!hasVideoTrack) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack && videoTrack.enabled) {
        try {
          pc.addTrack(videoTrack, localStreamRef.current)
          console.log('✅ Added video track to peer connection')
        } catch (error) {
          console.error('Error adding video track:', error)
        }
      } else {
        console.warn('Video track not available or disabled')
      }
    } else {
      console.log('Video track already added')
    }
    
    // Add audio track if not already added
    if (!hasAudioTrack) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack && audioTrack.enabled) {
        try {
          pc.addTrack(audioTrack, localStreamRef.current)
          console.log('✅ Added audio track to peer connection')
        } catch (error) {
          console.error('Error adding audio track:', error)
        }
      } else {
        console.warn('Audio track not available or disabled')
      }
    } else {
      console.log('Audio track already added')
    }
    
    // Verify tracks were added
    const finalSenders = pc.getSenders()
    console.log('Final senders after adding tracks:', {
      total: finalSenders.length,
      tracks: finalSenders.map(s => s.track ? `${s.track.kind} (${s.track.enabled ? 'enabled' : 'disabled'})` : 'null')
    })
  }

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionRef.current = pc

    // Add local stream tracks
    addLocalTracksToPeerConnection(pc)

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote stream')
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          roomId: roomId || 'default'
        }))
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'failed') {
        setError('Peer connection failed')
      }
    }
  }

  const createOffer = async () => {
    if (!peerConnectionRef.current) {
      createPeerConnection()
    }

    try {
      const pc = peerConnectionRef.current
      
      // Ensure local tracks are added before creating offer
      addLocalTracksToPeerConnection(pc)
      
      // Only create offer if we're in stable state (no active negotiation)
      if (pc.signalingState !== 'stable') {
        console.log('Cannot create offer, connection state:', pc.signalingState)
        return
      }
      
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log('Created and set local offer')

      wsRef.current?.send(JSON.stringify({
        type: 'offer',
        offer: offer,
        roomId: roomId || 'default'
      }))
    } catch (error) {
      console.error('Error creating offer:', error)
      setError(`Error creating offer: ${error.message}`)
    }
  }

  const handleOffer = async (offer) => {
    if (!peerConnectionRef.current) {
      createPeerConnection()
    }

    try {
      const pc = peerConnectionRef.current
      
      // Ensure local tracks are added before handling offer
      addLocalTracksToPeerConnection(pc)
      
      // Only handle offer if we're in stable state (no active negotiation)
      if (pc.signalingState === 'stable') {
        console.log('Setting remote offer, current state:', pc.signalingState)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        wsRef.current?.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          roomId: roomId || 'default'
        }))
      } else {
        console.log('Cannot handle offer, connection state:', pc.signalingState, '- ignoring duplicate offer')
      }
    } catch (error) {
      console.error('Error handling offer:', error)
      setError(`Error handling offer: ${error.message}`)
    }
  }

  const handleAnswer = async (answer) => {
    if (!peerConnectionRef.current) return

    try {
      const pc = peerConnectionRef.current
      const currentState = pc.signalingState
      
      // Only set remote answer if we're in the correct state
      // We should be in "have-local-offer" state after creating and setting our offer
      if (currentState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log('Successfully set remote answer')
      } else if (currentState === 'stable') {
        // Connection might already be established, check if we need to update
        console.log('Connection already stable, answer may be redundant')
        // Try to set it anyway, but catch the error gracefully
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (e) {
          console.warn('Could not set remote answer (connection already established):', e.message)
        }
      } else {
        console.warn(`Cannot set remote answer in state: ${currentState}`)
        // Wait a bit and retry if we're transitioning
        setTimeout(async () => {
          if (pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(answer))
            } catch (e) {
              console.error('Error setting remote answer after retry:', e)
            }
          }
        }, 100)
      }
    } catch (error) {
      console.error('Error handling answer:', error)
      // Don't show error if connection is already established
      if (!error.message.includes('stable')) {
        setError(`Error handling answer: ${error.message}`)
      }
    }
  }

  const handleIceCandidate = async (candidate) => {
    if (!peerConnectionRef.current) return

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
    }
  }

  const cleanup = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  return (
    <div className="live-chat-container">
      <div className="chat-header">
        <h2>Live Chat - Room: {roomId || 'default'}</h2>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'Connected' : 'Connecting...'}
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
          <div className="video-label">You</div>
        </div>

        <div className="video-wrapper">
          {remoteUserId ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="video-preview remote-video"
              />
              <div className="video-label">Remote User</div>
            </>
          ) : (
            <div className="waiting-message">
              <p>Waiting for another user to join...</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="status status-error">
          {error}
        </div>
      )}
    </div>
  )
}

export default LiveChat

