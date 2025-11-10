# Quick Deployment Guide

## TL;DR - Deploy in 5 Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/near.git
git push -u origin main
```

### 2. Deploy Backend to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - **Name:** `near-signaling-server`
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && npm start`
5. Click "Create Web Service"
6. **Copy the URL** (e.g., `https://near-signaling-server.onrender.com`)

### 3. Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import GitHub repo
4. Add Environment Variables:
   ```
   VITE_R2_ACCOUNT_ID=your_account_id
   VITE_R2_ACCESS_KEY_ID=your_key
   VITE_R2_SECRET_ACCESS_KEY=your_secret
   VITE_R2_BUCKET_NAME=your_bucket
   VITE_WS_URL=wss://near-signaling-server.onrender.com
   ```
5. Click "Deploy"

### 4. Update CORS

**Cloudflare R2:**
- Dashboard → R2 → Your Bucket → Settings → CORS
- Add your Vercel URL to `AllowedOrigins`

**Render (if needed):**
- Service Settings → Environment Variables
- Add: `CORS_ORIGIN` = `https://your-app.vercel.app`

### 5. Test!

Open your Vercel URL in two browsers and test the video call!

---

**Full details:** See `DEPLOYMENT.md`

