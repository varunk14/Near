import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecordings } from '../utils/api'
import './Dashboard.css'

// Get R2 public URL (you'll need to configure this based on your R2 setup)
const getR2PublicUrl = (filename) => {
  // For now, we'll construct a URL. You may need to adjust this based on your R2 public URL setup
  // If you have a public R2 URL, use it here. Otherwise, you might need to create signed URLs via backend
  const bucketName = import.meta.env.VITE_R2_BUCKET_NAME
  const accountId = import.meta.env.VITE_R2_ACCOUNT_ID
  
  // Note: This assumes you have a public R2 bucket or custom domain
  // For production, you might want to create a backend endpoint that generates signed URLs
  return `https://pub-${accountId}.r2.dev/${bucketName}/${filename}`
}

function Dashboard() {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchRecordings()
  }, [])

  const fetchRecordings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getRecordings()
      setRecordings(data)
    } catch (err) {
      setError(err.message || 'Failed to load recordings')
      console.error('Error fetching recordings:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      recording: { label: 'Recording', class: 'status-recording' },
      completed: { label: 'Completed', class: 'status-completed' },
      processing: { label: 'Processing', class: 'status-processing' },
      ready: { label: 'Ready', class: 'status-ready' }
    }
    
    const statusInfo = statusMap[status] || { label: status, class: 'status-unknown' }
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h1>Recordings Dashboard</h1>
          <Link to="/" className="btn btn-back">
            ← Back to Home
          </Link>
        </div>

        {error && (
          <div className="status status-error">
            <div>
              <strong>Error:</strong> {error}
              {(error.includes('Database') || error.includes('table')) && (
                <div className="error-hint">
                  <p>💡 Make sure you've:</p>
                  <ol>
                    <li>Created the Recordings table in Supabase (run the SQL schema)</li>
                    <li>Configured SUPABASE_URL and SUPABASE_ANON_KEY in your Render backend</li>
                  </ol>
                </div>
              )}
            </div>
            <button onClick={fetchRecordings} className="btn-retry">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="loading-message">
            <p>Loading recordings...</p>
          </div>
        ) : recordings.length === 0 ? (
          <div className="empty-state">
            <p>No recordings yet.</p>
            <p className="empty-hint">Start recording in a studio to see your recordings here.</p>
            <Link to="/" className="btn btn-primary">
              Create Studio
            </Link>
          </div>
        ) : (
          <div className="recordings-list">
            {recordings.map((recording) => (
              <div key={recording.id} className="recording-card">
                <div className="recording-header">
                  <div className="recording-title">
                    <h3>
                      {recording.studios?.name 
                        ? `${recording.studios.name} - ${recording.user_name || 'Recording'}`
                        : recording.user_name 
                        ? `${recording.user_name}'s Recording`
                        : 'Studio Session'}
                    </h3>
                    {getStatusBadge(recording.status)}
                  </div>
                  <div className="recording-meta">
                    <span className="recording-date">
                      {formatDate(recording.started_at)}
                    </span>
                    {recording.chunk_count > 0 && (
                      <span className="recording-chunks">
                        {recording.chunk_count} chunk{recording.chunk_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {recording.file_paths && recording.file_paths.length > 0 ? (
                  <div className="recording-files">
                    <h4>Download Files:</h4>
                    <div className="file-list">
                      {recording.file_paths.map((filePath, index) => (
                        <a
                          key={index}
                          href={getR2PublicUrl(filePath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          📥 {filePath}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-files">
                    <p>No files uploaded yet.</p>
                  </div>
                )}

                {recording.recording_id && (
                  <div className="recording-id">
                    <small>Recording ID: {recording.recording_id}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

