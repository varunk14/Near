#!/bin/bash

# Script to add Supabase environment variables to .env file

echo "🔧 Adding Supabase configuration to .env file"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Creating one..."
  touch .env
fi

# Check if Supabase vars already exist
if grep -q "VITE_SUPABASE_URL" .env; then
  echo "⚠️  Supabase variables already exist in .env"
  echo "   Current values:"
  grep "VITE_SUPABASE_URL\|SUPABASE_URL" .env | head -2
  echo ""
  read -p "Do you want to update them? (y/n): " update
  if [ "$update" != "y" ]; then
    echo "Skipping..."
    exit 0
  fi
fi

echo "Please provide your Supabase credentials:"
echo "(Find them at: https://supabase.com/dashboard → Your Project → Settings → API)"
echo ""

read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Anon Key (starts with eyJ...): " SUPABASE_KEY

# Remove existing Supabase entries
sed -i.bak '/^VITE_SUPABASE_URL=/d' .env
sed -i.bak '/^VITE_SUPABASE_ANON_KEY=/d' .env
sed -i.bak '/^SUPABASE_URL=/d' .env
sed -i.bak '/^SUPABASE_ANON_KEY=/d' .env
rm -f .env.bak

# Add new entries
echo "" >> .env
echo "# Supabase Configuration" >> .env
echo "VITE_SUPABASE_URL=$SUPABASE_URL" >> .env
echo "VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY" >> .env
echo "SUPABASE_URL=$SUPABASE_URL" >> .env
echo "SUPABASE_ANON_KEY=$SUPABASE_KEY" >> .env

echo ""
echo "✅ Supabase variables added to .env file!"
echo ""
echo "📝 Added:"
echo "   VITE_SUPABASE_URL=$SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY"
echo "   SUPABASE_URL=$SUPABASE_URL"
echo "   SUPABASE_ANON_KEY=$SUPABASE_KEY"
echo ""
echo "🚀 Now restart your servers to use the new configuration!"

