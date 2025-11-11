#!/bin/bash

# Setup script for local development environment variables

echo "🔧 Near Local Development Setup"
echo "================================"
echo ""

# Check if .env file exists
if [ -f .env ]; then
  echo "📄 Found .env file, loading variables..."
  export $(cat .env | grep -v '^#' | xargs)
fi

echo ""
echo "Please provide your Supabase credentials:"
echo "(You can find these at: https://supabase.com/dashboard → Your Project → Settings → API)"
echo ""

# Prompt for Supabase URL
if [ -z "$VITE_SUPABASE_URL" ]; then
  read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL_INPUT
  export VITE_SUPABASE_URL="$SUPABASE_URL_INPUT"
  export SUPABASE_URL="$SUPABASE_URL_INPUT"
else
  echo "✅ SUPABASE_URL already set: $SUPABASE_URL"
fi

# Prompt for Supabase Anon Key
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  read -p "Enter your Supabase Anon Key (starts with eyJ...): " SUPABASE_KEY_INPUT
  export VITE_SUPABASE_ANON_KEY="$SUPABASE_KEY_INPUT"
  export SUPABASE_ANON_KEY="$SUPABASE_KEY_INPUT"
else
  echo "✅ SUPABASE_ANON_KEY already set"
fi

# Set other required variables
export CORS_ORIGIN=http://localhost:5173
export PORT=3001
export VITE_WS_URL=ws://localhost:3001
export VITE_API_URL=http://localhost:3001

echo ""
echo "✅ Environment variables set!"
echo ""
echo "📝 To save these for future use, add them to a .env file:"
echo "   VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY"
echo "   SUPABASE_URL=$SUPABASE_URL"
echo "   SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "   CORS_ORIGIN=$CORS_ORIGIN"
echo "   PORT=$PORT"
echo "   VITE_WS_URL=$VITE_WS_URL"
echo "   VITE_API_URL=$VITE_API_URL"
echo ""
echo "🚀 Now you can start the servers:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd server && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm run dev"
echo ""

