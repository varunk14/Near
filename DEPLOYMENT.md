# Deployment Guide for Near

This guide will help you deploy Near to production using Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account
- Vercel account (free tier)
- Render account (free tier)
- Cloudflare R2 bucket with CORS configured

## Step 1: Push Code to GitHub

1. **Initialize Git repository (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - MVP 3"
   ```

2. **Create a new repository on GitHub** and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/near.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy Backend to Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name:** `near-signaling-server` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && npm start`
   - **Root Directory:** Leave empty (or set to root if needed)
5. **Click "Create Web Service"**
6. **Wait for deployment to complete**
7. **Note the URL** (e.g., `https://near-signaling-server.onrender.com`)
8. **The WebSocket URL will be:** `wss://near-signaling-server.onrender.com` (note the `wss://` protocol)

## Step 3: Deploy Frontend to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "Add New..." → "Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Add Environment Variables:**
   - `VITE_R2_ACCOUNT_ID` - Your Cloudflare R2 Account ID
   - `VITE_R2_ACCESS_KEY_ID` - Your R2 Access Key ID
   - `VITE_R2_SECRET_ACCESS_KEY` - Your R2 Secret Access Key
   - `VITE_R2_BUCKET_NAME` - Your R2 Bucket Name
   - `VITE_WS_URL` - Your Render WebSocket URL (e.g., `wss://near-signaling-server.onrender.com`)
6. **Click "Deploy"**
7. **Wait for deployment to complete**
8. **Note your Vercel URL** (e.g., `https://near.vercel.app`)

## Step 4: Update CORS Configuration

1. **Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS Policy**
2. **Update the CORS configuration** to include your Vercel domain:
   ```json
   [
     {
       "AllowedOrigins": [
         "http://localhost:5173",
         "https://your-app.vercel.app"
       ],
       "AllowedMethods": [
         "GET",
         "PUT",
         "POST",
         "DELETE",
         "HEAD"
       ],
       "AllowedHeaders": [
         "*"
       ],
       "ExposeHeaders": [
         "ETag"
       ],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Replace `your-app.vercel.app` with your actual Vercel domain.

## Step 5: Update Render CORS (if needed)

If you encounter CORS issues with the WebSocket connection, you may need to configure CORS on Render:

1. **In your Render service settings**, add environment variable:
   - `CORS_ORIGIN` = `https://your-app.vercel.app`

2. **Update `server/server.js`** to use the CORS origin from environment:
   ```javascript
   const corsOptions = {
     origin: process.env.CORS_ORIGIN || '*',
     credentials: true
   }
   app.use(cors(corsOptions))
   ```

## Step 6: Test Your Deployment

1. **Open your Vercel URL** in two different browsers (or devices)
2. **Test the Live Chat:**
   - Browser 1: Create a room
   - Browser 2: Join using the room ID
   - Both should see and hear each other!

3. **Test the Recording Studio:**
   - Go to Recording Studio
   - Record a video
   - Check your R2 bucket for uploaded chunks

## Troubleshooting

### Backend Issues

**"Service keeps restarting"**
- Check Render logs for errors
- Ensure `package.json` has correct start script
- Verify Node.js version compatibility

**"WebSocket connection failed"**
- Check that Render service is running
- Verify WebSocket URL uses `wss://` (not `ws://`)
- Check browser console for connection errors

### Frontend Issues

**"Environment variables not working"**
- Ensure all `VITE_` prefixed variables are set in Vercel
- Redeploy after adding new environment variables
- Check Vercel build logs for errors

**"CORS errors"**
- Update R2 CORS configuration with your Vercel domain
- Check that CORS allows your Vercel origin

**"WebSocket connection to Render fails"**
- Verify Render service is running
- Check that WebSocket URL is correct in Vercel environment variables
- Render free tier services may spin down after inactivity - first request may be slow

## Render Free Tier Notes

- Services may spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid tier for always-on service

## Next Steps

After successful deployment:
- Share your Vercel URL with others to test
- Monitor Render and Vercel logs for any issues
- Consider setting up custom domains
- For production, consider upgrading Render to keep service always-on

