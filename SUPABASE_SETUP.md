# Supabase Setup for Near

This guide will help you set up Supabase for MVP 5: Dynamic Studios.

## Step 1: Create Supabase Project

1. **Go to [Supabase Dashboard](https://app.supabase.com/)**
2. **Sign up/Login** (free tier available)
3. **Click "New Project"**
4. **Fill in project details:**
   - Name: `near` (or your preferred name)
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to you
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for project to be created

## Step 2: Get Your Supabase Credentials

1. **Go to Project Settings** (gear icon in left sidebar)
2. **Click "API"** in the settings menu
3. **Copy these values:**
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 3: Create Database Schema

1. **Go to SQL Editor** (left sidebar)
2. **Click "New query"**
3. **Copy and paste the SQL from `server/supabase-schema.sql`**
4. **Click "Run"** (or press Cmd/Ctrl + Enter)
5. **Verify the table was created:**
   - Go to "Table Editor" (left sidebar)
   - You should see a `studios` table

## Step 4: Configure Backend (Render)

1. **Go to your Render service settings**
2. **Add Environment Variables:**
   - `SUPABASE_URL` = Your Project URL from Step 2
   - `SUPABASE_ANON_KEY` = Your anon/public key from Step 2
3. **Save and redeploy** (or wait for auto-deploy)

## Step 5: Verify Setup

1. **Test the API endpoint:**
   ```bash
   # Replace 'your-render-url.onrender.com' with your actual Render service URL
   curl -X POST https://your-render-url.onrender.com/api/create-studio \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Studio"}'
   ```
   
   **Expected response:**
   ```json
   {
     "id": "123e4567-e89b-12d3-a456-426614174000",
     "name": "Test Studio",
     "created_at": "2024-01-01T00:00:00.000Z"
   }
   ```
   
   You should get a response with a studio ID.

2. **Check Supabase Table Editor:**
   - Go to Table Editor → studios
   - You should see the new studio entry

## Troubleshooting

**"Supabase credentials not found"**
- Check that environment variables are set in Render
- Verify variable names are exactly: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Redeploy after adding variables

**"Failed to create studio"**
- Check Supabase SQL Editor for any errors
- Verify the `studios` table exists
- Check RLS policies are set correctly

**"Studio not found"**
- Verify the studio ID is correct
- Check that the studio exists in Supabase Table Editor

## Next Steps

After setup, studios will be saved to the database and you can:
- Create studios with custom names
- Share studio links that persist
- View studio history (in future MVPs)

