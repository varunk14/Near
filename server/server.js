import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'http'
import cors from 'cors'

const app = express()
const server = http.createServer(app)

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
          ws.roomId = currentRoom
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'joined',
            userId,
            roomId: currentRoom
          }))

          // Notify other users in the room
          broadcastToRoom(currentRoom, ws, {
            type: 'user-joined',
            userId
          })
          
          console.log(`User ${userId} joined room ${currentRoom}`)
          break

        case 'offer':
          // Relay offer to other users in the room
          broadcastToRoom(currentRoom, ws, {
            type: 'offer',
            offer: data.offer,
            from: userId
          })
          break

        case 'answer':
          // Relay answer to other users in the room
          broadcastToRoom(currentRoom, ws, {
            type: 'answer',
            answer: data.answer,
            from: userId
          })
          break

        case 'ice-candidate':
          // Relay ICE candidate to other users in the room
          broadcastToRoom(currentRoom, ws, {
            type: 'ice-candidate',
            candidate: data.candidate,
            from: userId
          })
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`)
  console.log(`WebSocket server ready for connections`)
})

