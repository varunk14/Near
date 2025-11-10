# Near - Studio Quality Recording

A browser-based recording studio that captures high-quality video and audio locally and uploads to Cloudflare R2.

## MVP 3: Live Chat (1-to-1 WebRTC) ✅

This MVP implements live video chat between two users using WebRTC. Users can create or join rooms and see/hear each other in real-time. This is a basic 1-to-1 video call with no recording yet.

### Features

**MVP 2 (Recording Studio):**
- ✅ Simple React component (`<Studio />`)
- ✅ Access webcam and microphone via `getUserMedia()`
- ✅ Display local video preview (muted)
- ✅ Record using `MediaRecorder` API with 10-second timeslice
- ✅ **Progressive upload**: Chunks upload automatically every 10 seconds during recording
- ✅ **Robust against failures**: Even if browser crashes, uploaded chunks are preserved
- ✅ Real-time chunk upload progress display

**MVP 3 (Live Chat):**
- ✅ Node.js signaling server with WebSocket support
- ✅ React Router for navigation between Studio and Chat
- ✅ WebRTC peer-to-peer video/audio connection
- ✅ Room-based chat system (create or join rooms)
- ✅ Real-time video/audio streaming between two users
- ✅ STUN servers for NAT traversal

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Cloudflare account with R2 enabled (for recording features)
- A Cloudflare R2 bucket created (for recording features)

### Setup

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Configure Cloudflare R2 (for recording features):**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > R2
   - Create a new bucket (or use an existing one)
   - Go to "Manage R2 API Tokens" and create a new API token
   - Note down:
     - Your Account ID
     - Access Key ID
     - Secret Access Key
     - Bucket Name

4. **Set up frontend environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your R2 credentials:
   ```
   VITE_R2_ACCOUNT_ID=your_account_id_here
   VITE_R2_ACCESS_KEY_ID=your_access_key_id_here
   VITE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
   VITE_R2_BUCKET_NAME=your_bucket_name_here
   ```

5. **Configure CORS on R2 bucket (for recording features):**
   - See `CORS_SETUP.md` for detailed instructions
   - Go to Cloudflare Dashboard > R2 > Your Bucket > Settings > CORS Policy
   - Add CORS configuration to allow `http://localhost:5173`

6. **Start the backend signaling server:**
   ```bash
   cd server
   npm run dev
   ```
   Keep this terminal open. The server will run on `http://localhost:3001`

7. **Start the frontend development server (in a new terminal):**
   ```bash
   npm run dev
   ```

8. **Open your browser:**
   - Navigate to the URL shown in the terminal (usually `http://localhost:5173`)
   - You'll see the home page with two options:
     - **Recording Studio**: For recording with progressive upload
     - **Live Chat**: For 1-to-1 video calls

### Testing MVP 3 (Live Chat)

1. **Open the app in two different browsers** (or use incognito mode for the second one)
2. **In the first browser:**
   - Click "Create Room" in the Live Chat section
   - You'll be taken to a chat room with a unique room ID
3. **In the second browser:**
   - Copy the room ID from the first browser's URL
   - Paste it in the "Enter room ID" field
   - Click "Join Room"
4. **Both users should now see and hear each other!**

### Success Criteria (MVP 3)

✅ Two users, in separate browsers, can open the app and see and hear each other live.

### Technology Stack

- **Frontend:** React 18 with Vite
- **Recording:** MediaRecorder API
- **Storage:** Cloudflare R2 (S3-compatible)
- **Upload:** AWS SDK v3 (@aws-sdk/client-s3)

### Project Structure

```
Near/
├── src/
│   ├── components/
│   │   ├── Studio.jsx      # Main recording component
│   │   └── Studio.css
│   ├── utils/
│   │   └── r2Upload.js     # R2 upload utility
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

### Next Steps (MVP 4)

The next MVP will combine MVP 2 and MVP 3 - the "Dual Stream" architecture. Users will have a live video chat (low-quality) while simultaneously recording their own high-quality streams locally and uploading them to R2.

### Troubleshooting

**"Error accessing media devices"**
- Make sure you've granted camera and microphone permissions in your browser
- Check that no other application is using your camera/microphone

**"R2 configuration is missing"**
- Verify your `.env` file exists and contains all required variables
- Make sure variable names start with `VITE_` (required for Vite to expose them)

**"Upload failed" or "Failed to fetch"**
- Double-check your R2 credentials in `.env`
- Verify your bucket name is correct
- Ensure your R2 API token has write permissions
- **Most importantly**: Make sure CORS is configured on your R2 bucket (see `CORS_SETUP.md`)

**Chunks not uploading during recording**
- Check browser console for errors
- Verify CORS is properly configured
- Ensure network connection is stable
- Check that chunks appear in R2 bucket (they upload every 10 seconds)

**WebRTC connection issues (Live Chat)**
- Make sure the backend server is running on port 3001
- Check browser console for WebSocket connection errors
- Verify both users are in the same room (check the room ID in the URL)
- If video/audio doesn't work, check browser permissions for camera/microphone
- Some networks/firewalls may block WebRTC - try a different network
- Check that STUN servers are accessible (Google's STUN servers are used by default)

**"WebSocket connection error"**
- Ensure the backend server is running: `cd server && npm run dev`
- Check that the server is accessible at `ws://localhost:3001`
- For production, update `VITE_WS_URL` in `.env` to point to your deployed server

### License

MIT


