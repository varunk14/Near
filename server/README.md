# Near Signaling Server

WebRTC signaling server for the Near application. This server handles WebSocket connections and facilitates the exchange of WebRTC offer/answer and ICE candidates between peers.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Server will run on:**
   - HTTP: `http://localhost:3001`
   - WebSocket: `ws://localhost:3001`

## Environment Variables

- `PORT` - Server port (default: 3001)

## API Endpoints

- `GET /health` - Health check endpoint

## WebSocket Messages

### Client → Server

**Join Room:**
```json
{
  "type": "join-room",
  "roomId": "room_123",
  "userId": "user_456"
}
```

**Send Offer:**
```json
{
  "type": "offer",
  "offer": { ... RTCSessionDescription ... },
  "roomId": "room_123"
}
```

**Send Answer:**
```json
{
  "type": "answer",
  "answer": { ... RTCSessionDescription ... },
  "roomId": "room_123"
}
```

**Send ICE Candidate:**
```json
{
  "type": "ice-candidate",
  "candidate": { ... RTCIceCandidate ... },
  "roomId": "room_123"
}
```

### Server → Client

**Joined Confirmation:**
```json
{
  "type": "joined",
  "userId": "user_456",
  "roomId": "room_123"
}
```

**User Joined:**
```json
{
  "type": "user-joined",
  "userId": "user_789"
}
```

**User Left:**
```json
{
  "type": "user-left",
  "userId": "user_789"
}
```

**Relayed Messages:**
- `offer` - WebRTC offer from another user
- `answer` - WebRTC answer from another user
- `ice-candidate` - ICE candidate from another user

## Deployment

For production deployment on Render:

1. Set `PORT` environment variable (Render will provide this)
2. The server will automatically start when deployed

