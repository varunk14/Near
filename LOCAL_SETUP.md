# Local Development Setup

## Quick Start

### 1. Get Your Supabase Credentials

1. Go to https://supabase.com
2. Open your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2. Set Environment Variables

**For Backend (Terminal 1):**
```bash
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_ANON_KEY='your-anon-key-here'
export CORS_ORIGIN=http://localhost:5173
export PORT=3001
```

**For Frontend (Terminal 2):**
```bash
export VITE_SUPABASE_URL='https://your-project.supabase.co'
export VITE_SUPABASE_ANON_KEY='your-anon-key-here'
export VITE_WS_URL=ws://localhost:3001
export VITE_API_URL=http://localhost:3001
```

### 3. Start Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 4. Test

1. Open http://localhost:5173
2. Click "Log In" or "Sign Up"
3. Create a studio
4. Watch the backend terminal for logs

## Troubleshooting

- **"Supabase is not configured"**: Make sure you set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **"Failed to create studio"**: Check backend logs and ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- **CORS errors**: Make sure `CORS_ORIGIN` is set to `http://localhost:5173`

