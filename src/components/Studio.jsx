import { useState, useRef, useEffect } from 'react'
import { uploadToR2 } from '../utils/r2Upload'
import './Studio.css'

function Studio() {
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState(null)
  const [uploadedChunks, setUploadedChunks] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)
  
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const recordingIdRef = useRef(null)
  const chunkCounterRef = useRef(0)
  const pendingUploadsRef = useRef(new Set())
  const uploadedChunksCountRef = useRef(0)

  // Request camera and microphone access
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        
        streamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        setError(`Error accessing media devices: ${err.message}`)
        console.error('Error accessing media devices:', err)
      }
    }

    getMedia()

    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = () => {
    if (!streamRef.current) {
      setError('No media stream available')
      return
    }

    try {
      // Generate a unique recording ID for this session
      recordingIdRef.current = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      chunkCounterRef.current = 0
      uploadedChunksCountRef.current = 0
      setUploadedChunks(0)
      setCurrentChunk(0)
      pendingUploadsRef.current.clear()
      
      // Create MediaRecorder with webm codec
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      }

      // Fallback to default if the preferred codec isn't supported
      let mediaRecorder
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, options)
      } catch (e) {
        console.warn('Preferred codec not supported, using default:', e)
        mediaRecorder = new MediaRecorder(streamRef.current)
      }

      // Handle chunks as they become available (every 10 seconds)
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          const chunkNumber = chunkCounterRef.current++
          setCurrentChunk(chunkNumber + 1)
          
          // Upload chunk immediately
          await handleChunkUpload(event.data, chunkNumber)
        }
      }

      // Handle final chunk when recording stops
      mediaRecorder.onstop = async () => {
        // Request any remaining data
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.requestData()
        }
        
        // Wait for all pending uploads to complete
        while (pendingUploadsRef.current.size > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        setUploadStatus(`Recording complete! Uploaded ${uploadedChunksCountRef.current} chunk${uploadedChunksCountRef.current !== 1 ? 's' : ''}.`)
        setIsUploading(false)
      }

      mediaRecorderRef.current = mediaRecorder
      // Start recording with 10-second timeslice for progressive upload
      mediaRecorder.start(10000)
      setIsRecording(true)
      setUploadStatus('Recording started. Chunks will upload every 10 seconds...')
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
    if (!recordingIdRef.current) {
      console.error('No recording ID available')
      return
    }

    const uploadId = `${recordingIdRef.current}_chunk_${chunkNumber}`
    pendingUploadsRef.current.add(uploadId)
    setIsUploading(true)

    try {
      // Generate filename with sequential chunk number
      const chunkFilename = `${recordingIdRef.current}_chunk_${String(chunkNumber).padStart(3, '0')}.webm`
      
      await uploadToR2(chunkBlob, chunkFilename)
      
      // Update uploaded chunks count
      uploadedChunksCountRef.current += 1
      setUploadedChunks(uploadedChunksCountRef.current)
      setUploadStatus(`Uploaded chunk ${chunkNumber + 1}...`)
      
      console.log(`Successfully uploaded chunk ${chunkNumber}: ${chunkFilename}`)
    } catch (err) {
      console.error(`Error uploading chunk ${chunkNumber}:`, err)
      setError(`Failed to upload chunk ${chunkNumber + 1}: ${err.message}`)
    } finally {
      pendingUploadsRef.current.delete(uploadId)
      // Only set isUploading to false if no more pending uploads
      if (pendingUploadsRef.current.size === 0 && !isRecording) {
        setIsUploading(false)
      }
    }
  }

  return (
    <div className="studio-container">
      <div className="video-wrapper">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-preview"
        />
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            Recording...
          </div>
        )}
      </div>

      <div className="controls">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="btn btn-record"
            disabled={isUploading}
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

      {isRecording && (
        <div className="status status-info">
          {uploadedChunks > 0 
            ? `Recording... ${uploadedChunks} chunk${uploadedChunks !== 1 ? 's' : ''} uploaded`
            : 'Recording... Waiting for first chunk...'}
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

export default Studio

