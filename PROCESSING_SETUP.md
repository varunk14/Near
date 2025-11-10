# Post-Processing Pipeline Setup Guide (MVP 10)

This guide will help you set up the automatic file merging pipeline that combines recording chunks into a single downloadable file.

## Overview

When a recording ends, the system automatically:
1. Triggers a GitHub Actions workflow
2. Downloads all chunks from R2
3. Merges them with FFmpeg
4. Uploads the final file
5. Updates the database status

---

## Step 1: Create GitHub Personal Access Token

### Why?
The backend needs a GitHub token to trigger the workflow via API.

### How to Create:

1. **Go to GitHub.com** and sign in
2. **Click your profile picture** (top right) → **Settings**
3. **Scroll down** to **Developer settings** (left sidebar, at the bottom)
4. **Click "Personal access tokens"** → **"Tokens (classic)"**
5. **Click "Generate new token"** → **"Generate new token (classic)"**
6. **Fill in the form:**
   - **Note:** `Near Processing Pipeline`
   - **Expiration:** Choose your preference (90 days, 1 year, or no expiration)
   - **Scopes:** Check **`repo`** (this gives full repository access)
7. **Click "Generate token"** at the bottom
8. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Add to Render:

1. Go to your **Render Dashboard** → Your backend service
2. Go to **Environment** tab
3. Click **"Add Environment Variable"**
4. Add:
   - **Key:** `GITHUB_TOKEN`
   - **Value:** Paste your token (the `ghp_...` string)
5. Click **"Save Changes"**

---

## Step 2: Add GitHub Repository Name

### Why?
The backend needs to know which repository to trigger the workflow in.

### How to Add:

1. In **Render Dashboard** → Your backend service → **Environment** tab
2. Click **"Add Environment Variable"**
3. Add:
   - **Key:** `GITHUB_REPO`
   - **Value:** `varunk14/Near` (replace with your GitHub username/repo name)
   - Format: `username/repository-name` (no spaces, lowercase)
4. Click **"Save Changes"**

**Example:**
- If your GitHub username is `varunk14` and repo is `Near`
- Value: `varunk14/Near`

---

## Step 3: Add GitHub Secrets (for GitHub Actions)

### Why?
The GitHub Actions workflow needs R2 credentials to download/upload files.

### How to Add:

1. **Go to your GitHub repository** (e.g., `https://github.com/varunk14/Near`)
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **"New repository secret"** for each:

   **Secret 1: R2_ACCOUNT_ID**
   - **Name:** `R2_ACCOUNT_ID`
   - **Value:** Your Cloudflare R2 Account ID
   - Click **"Add secret"**

   **Secret 2: R2_ACCESS_KEY_ID**
   - **Name:** `R2_ACCESS_KEY_ID`
   - **Value:** Your R2 Access Key ID
   - Click **"Add secret"**

   **Secret 3: R2_SECRET_ACCESS_KEY**
   - **Name:** `R2_SECRET_ACCESS_KEY`
   - **Value:** Your R2 Secret Access Key
   - Click **"Add secret"**

   **Secret 4: R2_BUCKET_NAME**
   - **Name:** `R2_BUCKET_NAME`
   - **Value:** Your R2 Bucket Name
   - Click **"Add secret"**

### Where to Find R2 Credentials:

1. Go to **Cloudflare Dashboard** → **R2**
2. Click on your bucket
3. Go to **Settings** → **R2 API Tokens**
4. Your credentials are there (same ones you used for Vercel)

---

## Step 4: Update Database Schema

### Why?
The database needs a `final_file_path` column to store the merged file path.

### How to Update:

1. **Go to Supabase Dashboard** → Your project
2. Click **SQL Editor** (left sidebar)
3. Click **"New query"**
4. **Copy and paste this SQL:**

```sql
-- Add final_file_path column if it doesn't exist
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS final_file_path TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recordings_final_file_path 
ON recordings(final_file_path) 
WHERE final_file_path IS NOT NULL;
```

5. Click **"Run"** (or press `Cmd/Ctrl + Enter`)
6. You should see: **"Success. No rows returned"**

### Verify:

1. Go to **Table Editor** → **recordings** table
2. Check that the `final_file_path` column exists
3. It should be a text field (nullable)

---

## Step 5: (Optional) Add Render API URL

### Why?
Helps the workflow know where to send status updates.

### How to Add:

1. In **Render Dashboard** → Your backend service → **Environment** tab
2. Click **"Add Environment Variable"**
3. Add:
   - **Key:** `RENDER_API_URL`
   - **Value:** Your Render service URL (e.g., `https://near-signaling-server.onrender.com`)
4. Click **"Save Changes"**

**Note:** If not set, it will auto-detect from `CORS_ORIGIN`, but it's better to set it explicitly.

---

## Step 6: Redeploy Backend

### Why?
Environment variables only take effect after redeployment.

### How to Redeploy:

1. In **Render Dashboard** → Your backend service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete (2-3 minutes)

---

## Step 7: Test the Pipeline

### How to Test:

1. **Create a studio** (must be logged in)
2. **Join the studio** and start recording
3. **Record for at least 20 seconds** (to get 2+ chunks)
4. **Stop recording**
5. **Go to Dashboard**
6. You should see:
   - Status changes: "Completed" → "Processing..." → "Ready"
   - Final file download link appears when ready

### Check GitHub Actions:

1. Go to your **GitHub repository**
2. Click **"Actions"** tab
3. You should see **"Process Recording"** workflow runs
4. Click on a run to see logs

---

## Troubleshooting

### ❌ "Processing not configured" error

**Problem:** GitHub token or repo not set in Render

**Solution:**
- Check `GITHUB_TOKEN` and `GITHUB_REPO` are in Render environment variables
- Make sure you redeployed after adding them

### ❌ Workflow fails to download chunks

**Problem:** R2 secrets not set in GitHub

**Solution:**
- Check all 4 R2 secrets are in GitHub repository secrets
- Verify the secret names match exactly (case-sensitive)

### ❌ "Failed to trigger workflow" error

**Problem:** GitHub token doesn't have correct permissions

**Solution:**
- Make sure token has `repo` scope
- Create a new token if needed

### ❌ Status stuck on "Processing"

**Problem:** Workflow failed or database update failed

**Solution:**
- Check GitHub Actions logs for errors
- Verify `RENDER_API_URL` is set correctly
- Check database connection

### ❌ Final file not showing

**Problem:** Database column missing or workflow didn't update

**Solution:**
- Run the SQL schema update (Step 4)
- Check GitHub Actions logs
- Manually check database for `final_file_path` column

---

## Quick Checklist

- [ ] Created GitHub Personal Access Token with `repo` scope
- [ ] Added `GITHUB_TOKEN` to Render environment variables
- [ ] Added `GITHUB_REPO` to Render environment variables (format: `username/repo`)
- [ ] Added 4 R2 secrets to GitHub repository secrets
- [ ] Updated Supabase database schema (added `final_file_path` column)
- [ ] (Optional) Added `RENDER_API_URL` to Render
- [ ] Redeployed Render backend service
- [ ] Tested recording and checked Dashboard

---

## Environment Variables Summary

### Render Backend:
- `GITHUB_TOKEN` - Your GitHub Personal Access Token
- `GITHUB_REPO` - Your repository (e.g., `varunk14/Near`)
- `RENDER_API_URL` - (Optional) Your Render service URL

### GitHub Repository Secrets:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

---

## Need Help?

If you encounter issues:
1. Check GitHub Actions logs (repository → Actions tab)
2. Check Render logs (Dashboard → Your service → Logs)
3. Verify all environment variables are set correctly
4. Make sure you redeployed after adding variables

The pipeline should work automatically once all steps are completed! 🎉

