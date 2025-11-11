#!/bin/bash

# Start script for local development
# Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY before running

echo "🚀 Starting Near application locally..."
echo ""

# Check if Supabase env vars are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "⚠️  WARNING: SUPABASE_URL or SUPABASE_ANON_KEY not set!"
  echo "   The backend will run but studio creation won't work."
  echo "   Set them with:"
  echo "   export SUPABASE_URL='your-supabase-url'"
  echo "   export SUPABASE_ANON_KEY='your-anon-key'"
  echo ""
fi

# Start backend server
echo "📡 Starting backend server on port 3001..."
cd server
SUPABASE_URL=${SUPABASE_URL:-''} \
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-''} \
CORS_ORIGIN=http://localhost:5173 \
PORT=3001 \
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "🎨 Starting frontend server on port 5173..."
VITE_WS_URL=ws://localhost:3001 \
VITE_API_URL=http://localhost:3001 \
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers starting..."
echo "   Backend:  http://localhost:3001 (PID: $BACKEND_PID)"
echo "   Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "📝 Logs will appear above. Press Ctrl+C to stop both servers."
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

