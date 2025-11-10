# Project Document: "Near" (A Riverside.fm Clone)  
  
## 1. Project Overview  
  
**Project Name:** Near  
  
**Mission:** To build a high-fidelity, browser-based recording studio that captures studio-quality, multi-track audio and video from remote participants.  
  
**Core Philosophy:** The quality of the final recording must be independent of the participants' internet connection. This is achieved by **recording all participants locally** on their own devices and progressively uploading the high-quality files to the cloud. The live video chat is a low-latency "conference call" and is treated as a separate, lower-quality stream. This is the **"Dual Stream" architecture**.  
  
---  
  
## 2. The 100% Free Technology Stack  
  
This project will be built *exclusively* using free-tier services.  
  
* **Frontend:** **React (with Vite)** - A modern, fast single-page application (SPA).  
* **Frontend Hosting:** **Vercel (Free Tier)** - For continuous deployment and hosting of the React frontend.  
* **Backend API & Signaling:** **Node.js (with Express & `ws` library)** - A lightweight server for handling API requests and WebSocket-based WebRTC signaling.  
* **Backend Hosting:** **Render (Free Tier)** - For hosting the Node.js backend server.  
* **Database:** **Supabase (Free Tier)** - For a free Postgres database to manage users, studios, and recording metadata.  
* **File Storage:** **Cloudflare R2 (Free Tier)** - For **10 GB of free object storage** with **$0 egress fees**. This is critical for storing large video/audio files.  
* **WebRTC Relay:** **Open Relay Project (Free Tier)** - Provides free TURN servers to ensure WebRTC connections can be established even behind complex firewalls (NAT).  
* **Post-Processing:** **GitHub Actions (Free Tier for Public Repos)** - Used as a free, high-power compute service to run FFmpeg/Whisper jobs, which have a 6-hour timeout (unlike serverless functions).  
* **Processing Tools:** **FFmpeg** (for merging/cutting video) & **OpenAI's Whisper** (for transcription, as a future step).  
  
---  
  
## 3. The 10-MVP Development Plan  
  
### MVP 1: The Core Tech (Local Recording & Cloud Upload)  
  
* **Goal:** Prove the absolute core concept. Build a single webpage that records video/audio from a user's webcam and uploads the *complete* file to Cloudflare R2 when "stop" is pressed.  
* **Core Features:**  
    1.  A simple React component (`<Studio />`).  
    2.  Use `navigator.mediaDevices.getUserMedia()` to access the webcam and microphone.  
    3.  Display the local video in a `<video>` element (muted).  
    4.  Use the `MediaRecorder` API to start recording the stream.  
    5.  When "Stop" is clicked, take the final `Blob` and upload it to a Cloudflare R2 bucket.  
* **Key Technologies:** React (`useEffect`, `useRef`), `MediaRecorder` API, `aws-sdk` (or `fetch`) for R2 upload.  
* **Success Criteria:** I can press "record," talk for 20 seconds, press "stop," and see a new `.webm` file appear in my Cloudflare R2 bucket. No live chat, no multi-user.  
  
---  
  
### MVP 2: Progressive Upload (Robust Recording)  
  
* **Goal:** Make the recording from MVP 1 robust against browser crashes or network failure. Instead of uploading one giant file at the end, upload the recording in small, 10-second chunks *as it's being recorded*.  
* **Core Features:**  
    1.  Modify the `MediaRecorder` implementation.  
    2.  Call `mediaRecorder.start(10000)` (10-second timeslice).  
    3.  Listen to the `ondataavailable` event, which fires every 10 seconds.  
    4.  Take the `Blob` chunk from the event and immediately upload it to R2 with a sequential name (e.g., `recording_ABC_chunk_001.webm`, `recording_ABC_chunk_002.webm`).  
* **Key Technologies:** `MediaRecorder.start(timeslice)`, `dataavailable` event listener.  
* **Success Criteria:** I can press "record," and as I am recording, I can see new file chunks appearing in my R2 bucket every 10 seconds.  
  
---  
  
### MVP 3: The Live Chat (1-to-1 WebRTC)  
  
* **Goal:** Separately, prove that two users can have a live video chat. This MVP has **no recording**. It's just a basic, 1-to-1 Zoom.  
* **Core Features:**  
    1.  A simple Node.js (Express + `ws`) server deployed on **Render**. This is the **Signaling Server**.  
    2.  When a user connects to the React app, they establish a WebSocket connection to the signaling server.  
    3.  Implement the WebRTC `RTCPeerConnection` flow:  
        * User A creates an "offer."  
        * User A sends the "offer" (SDP) over the WebSocket to the server.  
        * Server relays the "offer" to User B.  
        * User B creates an "answer" and sends it back via the server.  
        * Both users exchange "ICE candidates" via the server.  
        * A direct peer-to-peer connection is established.  
* **Key Technologies:** `RTCPeerConnection`, `ws` (Node.js library), WebSockets, Render.  
* **Success Criteria:** Two users, in separate browsers, can open the app and see and hear each other live.  
  
---  
  
### MVP 4: The "Dual Stream" (The First Real "Near" Studio)  
  
* **Goal:** Combine MVP 2 and MVP 3. Create a 1-to-1 studio where two users can see each other live (low-quality) *while* both are simultaneously recording their *own* high-quality streams locally and uploading them to R2.  
* **Core Features:**  
    1.  When a user joins, get their `MediaStream` from `getUserMedia()`.  
    2.  **Split the stream:**  
        * Pass the `MediaStream` to the `RTCPeerConnection` (for the live chat, as in MVP 3).  
        * Pass the *same* `MediaStream` to a new `MediaRecorder` instance (for local recording, as in MVP 2).  
    3.  Each user is now doing two things: sending live video/audio to their peer *and* uploading their own high-res file chunks to R2.  
* **Key Technologies:** Combining `MediaRecorder` and `RTCPeerConnection` from the same `MediaStream`.  
* **Success Criteria:** Two users finish a call. The live call was "good enough," but in Cloudflare R2, there are *two* sets of high-quality recording chunks (one set for User A, one for User B).  
  
---  
  
### MVP 5: Dynamic "Studios" (Database Integration)  
  
* **Goal:** Stop using a single "hardcoded" room. Allow users to create unique, shareable "studio" links.  
* **Core Features:**  
    1.  Set up the **Supabase** Postgres database.  
    2.  Create a "Studios" table (`id` (UUID), `name`, `created_at`).  
    3.  Add a simple API endpoint to the **Render** (Node.js) server: `POST /api/create-studio`. This endpoint creates a new row in Supabase and returns the `id`.  
    4.  Add a "Home" page to the React app with a "Create Studio" button.  
    5.  Use **React Router** to create dynamic routes: `/studio/:studioId`.  
    6.  The WebRTC signaling logic from MVP 3 must be updated to use the `studioId` as the "room name."  
* **Key Technologies:** Supabase (Postgres), React Router, Node.js (Express), UUID.  
* **Success Criteria:** I can create a studio, get a link (e.g., `near.vercel.app/studio/123e4567...`), and send it to a friend. We both join *that specific room*.  
  
---  
  
### MVP 6: Multi-User Studios (N-to-N) & TURN Relay  
  
* **Goal:** Expand the studio from 1-to-1 to support 3-4 users. Add a TURN server for reliability.  
* **Core Features:**  
    1.  Refactor the WebRTC signaling logic (on the **Render** server) from a 1-to-1 assumption to a multi-user "mesh." When a new user joins, they must create a *separate* `RTCPeerConnection` for *every other user* already in the room.  
    2.  Integrate the **Open Relay Project** free TURN server credentials into the `RTCConfiguration` object. This ensures users behind complex firewalls can still connect.  
* **Key Technologies:** WebRTC (mesh architecture), TURN server configuration.  
* **Success Criteria:** Four users can join the same studio link and see/hear each other. All four are independently recording and uploading their own local files to R2.  
  
---  
  
### MVP 7: The "Green Room" (Device Selection)  
  
* **Goal:** Improve user experience by adding a pre-call "waiting room" where users can check their camera/mic and enter their name.  
* **Core Features:**  
    1.  Create a new React route: `/studio/:studioId/lobby`.  
    2.  Use `navigator.mediaDevices.enumerateDevices()` to get a list of all available cameras and microphones.  
    3.  Populate dropdown menus (`<select>`) to let the user choose their inputs.  
    4.  Show a local preview of their video.  
    5.  Have a "Join Call" button that passes the selected device IDs to the `getUserMedia` call in the main studio component.  
* **Key Technologies:** `navigator.mediaDevices.enumerateDevices()`, React state management (`useState`).  
* **Success Criteria:** Before joining a call, I am presented with a lobby where I can select my "Logitech Webcam" instead of my "Internal Webcam."  
  
---  
  
### MVP 8: The Dashboard (Viewing Recordings)  
  
* **Goal:** Create a simple, "logged-in" area where a user can see a list of their past recordings.  
* **Core Features:**  
    1.  Create a new React route: `/dashboard`.  
    2.  Create a new "Recordings" table in **Supabase** that links a `studio_id` to the file paths in R2 (e.g., `recording_ABC_user_XYZ.webm`).  
    3.  Create a new API endpoint on **Render**: `GET /api/recordings`. This endpoint will query the Supabase DB to get a list of recordings.  
    4.  The React dashboard fetches from this endpoint and displays a simple list of links to the files (which are simple links to the R2 bucket).  
* **Key Technologies:** Supabase (DB queries), Node.js (Express), React (`fetch`).  
* **Success Criteria:** After a call, I can go to the `/dashboard` page and see a new entry for "Studio Session - [Date]" and click a link to download the raw `.webm` files from R2.  
  
---  
  
### MVP 9: Basic User Authentication  
  
* **Goal:** Secure the dashboard and associate recordings with a "host" user.  
* **Core Features:**  
    1.  Integrate **Supabase Auth** (it's free and built-in).  
    2.  Add Sign Up, Log In, and Log Out functionality to the React app.  
    3.  Make the `/dashboard` route (and `POST /api/create-studio`) protected. Only logged-in users can access them.  
    4.  Update the database schema to link `Studios` and `Recordings` to a `user_id`.  
    5.  **Note:** Guests joining a studio *do not* need to log in. They still join anonymously.  
* **Key Technologies:** Supabase Auth (`supabase.auth.signIn()`, `supabase.auth.signOut()`).  
* **Success Criteria:** I must log in to create a studio or see my dashboard. My dashboard only shows recordings from studios *I* created.  
  
---  
  
### MVP 10: The Post-Processing Pipeline (File Merging)  
  
* **Goal:** Automatically combine the progressive upload chunks (`_chunk_001`, `_chunk_002`, etc.) into a single, downloadable file for each user.  
* **Core Features:**  
    1.  Create a **GitHub Actions workflow file** (`.github/workflows/process.yml`) in your public repository.  
    2.  Configure this workflow to run on a `workflow_dispatch` trigger (meaning it can be started by an API call).  
    3.  When a recording "ends," have your **Render** API send a `repository_dispatch` webhook to GitHub to start the job, passing the `recording_id`.  
    4.  The GitHub Action runner will:  
        * Install `aws-cli` (configured for R2) and `ffmpeg`.  
        * Use the `recording_id` to download all chunks for that recording from R2.  
        * Use `ffmpeg` to concatenate the chunks into a single file (`ffmpeg -f concat -i chunks.txt -c copy final.webm`).  
        * Upload the final, single `final.webm` file back to R2.  
        * Make an API call back to the Render server to update the Supabase DB row (e.g., `status: 'processed'`).  
* **Key Technologies:** GitHub Actions, `workflow_dispatch`, **FFmpeg**, `aws-cli` (for R2).  
* **Success Criteria:** After a recording, the pipeline runs automatically. On my dashboard, the recording shows "Processing..." and then changes to "Ready," with a single link to download the *complete* high-quality file.  
