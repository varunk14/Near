import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'http'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
const server = http.createServer(app)

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
  console.log('Supabase client initialized')
} else {
  console.warn('Supabase credentials not found. Studio creation will not be saved to database.')
}

// Enable CORS for all routes
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}
app.use(cors(corsOptions))
app.use(express.json())

// Store active connections (room -> Set of WebSocket connections)
const rooms = new Map()

// Create WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection')

  let currentRoom = null
  let userId = null

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log('Received message:', data.type)

      switch (data.type) {
        case 'join-room':
          currentRoom = data.roomId
          userId = data.userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // Add user to room
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set())
          }
          rooms.get(currentRoom).add(ws)
          
          ws.userId = userId
          ws.userName = data.userName || null
          ws.roomId = currentRoom
          
          // Get list of existing users in the room (for mesh connection) with their names
          const existingUsers = Array.from(rooms.get(currentRoom))
            .filter(client => client !== ws && client.userId)
            .map(client => ({
              userId: client.userId,
              userName: client.userName || null
            }))
          
          // Send confirmation with list of existing users (with names)
          ws.send(JSON.stringify({
            type: 'joined',
            userId,
            roomId: currentRoom,
            existingUsers: existingUsers.map(u => u.userId),
            existingUsersWithNames: existingUsers // Include names for display
          }))

          // Notify other users in the room about the new user (with name)
          broadcastToRoom(currentRoom, ws, {
            type: 'user-joined',
            userId,
            userName: data.userName || null
          })
          
          console.log(`User ${userId} (${data.userName || 'unnamed'}) joined room ${currentRoom}. Existing users: ${existingUsers.length}`)
          break

        case 'offer':
          // Relay offer to specific target user (for mesh architecture)
          if (data.to) {
            sendToUser(currentRoom, data.to, {
              type: 'offer',
              offer: data.offer,
              from: userId
            })
          } else {
            // Fallback: broadcast to all (for backward compatibility)
            broadcastToRoom(currentRoom, ws, {
              type: 'offer',
              offer: data.offer,
              from: userId
            })
          }
          break

        case 'answer':
          // Relay answer to specific target user (for mesh architecture)
          if (data.to) {
            sendToUser(currentRoom, data.to, {
              type: 'answer',
              answer: data.answer,
              from: userId
            })
          } else {
            // Fallback: broadcast to all
            broadcastToRoom(currentRoom, ws, {
              type: 'answer',
              answer: data.answer,
              from: userId
            })
          }
          break

        case 'ice-candidate':
          // Relay ICE candidate to specific target user (for mesh architecture)
          if (data.to) {
            sendToUser(currentRoom, data.to, {
              type: 'ice-candidate',
              candidate: data.candidate,
              from: userId
            })
          } else {
            // Fallback: broadcast to all
            broadcastToRoom(currentRoom, ws, {
              type: 'ice-candidate',
              candidate: data.candidate,
              from: userId
            })
          }
          break

        default:
          console.log('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Error handling message:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }))
    }
  })

  ws.on('close', () => {
    console.log('WebSocket connection closed')
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws)
      
      // Notify other users
      broadcastToRoom(currentRoom, ws, {
        type: 'user-left',
        userId
      })

      // Clean up empty rooms
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom)
      }
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

// Helper function to broadcast to all clients in a room except the sender
function broadcastToRoom(roomId, sender, message) {
  if (!rooms.has(roomId)) return

  const room = rooms.get(roomId)
  room.forEach((client) => {
    if (client !== sender && client.readyState === 1) { // 1 = OPEN
      client.send(JSON.stringify(message))
    }
  })
}

// Helper function to send message to a specific user in a room
function sendToUser(roomId, targetUserId, message) {
  if (!rooms.has(roomId)) return

  const room = rooms.get(roomId)
  room.forEach((client) => {
    if (client.userId === targetUserId && client.readyState === 1) { // 1 = OPEN
      client.send(JSON.stringify(message))
    }
  })
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

// API: Create a new studio
app.post('/api/create-studio', async (req, res) => {
  try {
    const { name } = req.body
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Studio name is required' })
    }

    if (!supabase) {
      // Fallback: generate UUID without database
      const studioId = `studio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      return res.json({
        id: studioId,
        name: name.trim(),
        created_at: new Date().toISOString(),
        message: 'Studio created (database not configured)'
      })
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('studios')
      .insert([
        {
          name: name.trim()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating studio:', error)
      return res.status(500).json({ error: 'Failed to create studio', details: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Error in create-studio endpoint:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// API: Get studio by ID
app.get('/api/studio/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!supabase) {
      return res.status(404).json({ error: 'Database not configured' })
    }

    const { data, error } = await supabase
      .from('studios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Studio not found' })
      }
      console.error('Error fetching studio:', error)
      return res.status(500).json({ error: 'Failed to fetch studio', details: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Error in get-studio endpoint:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// API: Create a new recording
app.post('/api/recordings', async (req, res) => {
  try {
    const { studio_id, recording_id, user_id, user_name } = req.body

    if (!recording_id) {
      return res.status(400).json({ error: 'Recording ID is required' })
    }

    if (!supabase) {
      return res.json({
        id: `rec_${Date.now()}`,
        recording_id,
        studio_id: studio_id || null,
        user_id: user_id || null,
        user_name: user_name || null,
        file_paths: [],
        chunk_count: 0,
        status: 'recording',
        message: 'Recording created (database not configured)'
      })
    }

    const { data, error } = await supabase
      .from('recordings')
      .insert([
        {
          studio_id: studio_id || null,
          recording_id,
          user_id: user_id || null,
          user_name: user_name || null,
          file_paths: [],
          chunk_count: 0,
          status: 'recording'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating recording:', error)
      return res.status(500).json({ error: 'Failed to create recording', details: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Error in create-recording endpoint:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// API: Update recording (add file path, update status, etc.)
app.patch('/api/recordings/:recording_id', async (req, res) => {
  try {
    const { recording_id } = req.params
    const { file_path, status, completed_at } = req.body

    if (!supabase) {
      return res.json({ message: 'Recording updated (database not configured)' })
    }

    // Get existing recording
    const { data: existing, error: fetchError } = await supabase
      .from('recordings')
      .select('*')
      .eq('recording_id', recording_id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Recording not found' })
    }

    // Update file_paths array if new file_path provided
    let file_paths = existing.file_paths || []
    if (file_path) {
      file_paths = [...file_paths, file_path]
    }

    // Update chunk_count
    const chunk_count = file_paths.length

    // Build update object
    const updateData = {
      file_paths,
      chunk_count
    }

    if (status) {
      updateData.status = status
    }

    if (completed_at) {
      updateData.completed_at = completed_at
    }

    const { data, error } = await supabase
      .from('recordings')
      .update(updateData)
      .eq('recording_id', recording_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating recording:', error)
      return res.status(500).json({ error: 'Failed to update recording', details: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Error in update-recording endpoint:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// API: Get all recordings
app.get('/api/recordings', async (req, res) => {
  try {
    const { studio_id } = req.query

    if (!supabase) {
      return res.json({
        recordings: [],
        message: 'Database not configured'
      })
    }

    let query = supabase
      .from('recordings')
      .select(`
        *,
        studios (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by studio_id if provided
    if (studio_id) {
      query = query.eq('studio_id', studio_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching recordings:', error)
      return res.status(500).json({ error: 'Failed to fetch recordings', details: error.message })
    }

    res.json({ recordings: data || [] })
  } catch (error) {
    console.error('Error in get-recordings endpoint:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`)
  console.log(`WebSocket server ready for connections`)
})

