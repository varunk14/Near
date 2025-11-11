#!/bin/bash

# View logs from running servers

echo "📋 Backend logs (server.js):"
echo "================================"
ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}' | xargs -I {} lsof -p {} 2>/dev/null | grep -q "server.js" && echo "Backend is running (PID: $(ps aux | grep 'node.*server.js' | grep -v grep | awk '{print $2}'))" || echo "Backend not running"

echo ""
echo "📋 Frontend logs (Vite):"
echo "================================"
if [ -f /tmp/vite.log ]; then
  tail -30 /tmp/vite.log
else
  echo "Frontend log file not found. Check if Vite is running."
fi

echo ""
echo "💡 To see real-time backend logs, run in a separate terminal:"
echo "   cd server && SUPABASE_URL='your-url' SUPABASE_ANON_KEY='your-key' npm run dev"
echo ""
echo "💡 To see real-time frontend logs, run in a separate terminal:"
echo "   VITE_WS_URL=ws://localhost:3001 VITE_API_URL=http://localhost:3001 npm run dev"

