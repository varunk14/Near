# Setting Up CORS for Cloudflare R2

To allow direct browser uploads to Cloudflare R2, you need to configure CORS on your bucket.

## Step-by-Step Instructions

1. **Go to Cloudflare Dashboard**
   - Navigate to [https://dash.cloudflare.com](https://dash.cloudflare.com)
   - Click on **R2** in the left sidebar

2. **Select Your Bucket**
   - Click on the bucket you're using for Near

3. **Open Settings**
   - Click on the **Settings** tab

4. **Configure CORS Policy**
   - Scroll down to the **CORS Policy** section
   - Click **Edit CORS Policy**

5. **Add CORS Configuration**
   - Paste the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000"
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

6. **Save the Configuration**
   - Click **Save** or **Update**

## For Production

When you deploy to Vercel, you'll need to add your production domain to the `AllowedOrigins` array:

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

## Alternative: Using R2's Public URL (Not Recommended for MVP 1)

If CORS setup is complex, you could use R2's public URL feature, but this exposes your bucket publicly. For MVP 1, we'll stick with direct uploads with CORS configured.

