import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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

function DualStream() {
  const { roomId } = useParams()
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState(null)
  const [remoteUserId, setRemoteUserId] = useState(null)
  const [uploadedChunks, setUploadedChunks] = useState(0)
  const [studioName, setStudioName] = useState(null)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const wsRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null) // High-quality stream for recording
  const webRTCStreamRef = useRef(null) // Lower-quality stream for WebRTC
  const userIdRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingIdRef = useRef(null)
  const chunkCounterRef = useRef(0)
  const pendingUploadsRef = useRef(new Set())
  const uploadedChunksCountRef = useRef(0)

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  useEffect(() => {
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
    initializeConnection()

    return () => {
      cleanup()
    }
  }, [roomId])

  const initializeConnection = async () => {
    try {
      // Get high-quality stream for recording
      const highQualityStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        }
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
          createPeerConnection()
          break

        case 'user-joined':
          console.log('User joined:', data.userId)
          setRemoteUserId(data.userId)
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

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionRef.current = pc

    addLocalTracksToPeerConnection(pc)

    pc.ontrack = (event) => {
      console.log('Received remote stream')
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          roomId: roomId || 'default'
        }))
      }
    }

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
      addLocalTracksToPeerConnection(pc)
      
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
      addLocalTracksToPeerConnection(pc)
      
      if (pc.signalingState === 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        wsRef.current?.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          roomId: roomId || 'default'
        }))
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
      
      if (currentState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log('Successfully set remote answer')
      } else if (currentState === 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (e) {
          console.warn('Could not set remote answer (connection already established):', e.message)
        }
      }
    } catch (error) {
      console.error('Error handling answer:', error)
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (webRTCStreamRef.current) {
      webRTCStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
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
          <div className="video-label">You (High Quality)</div>
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

