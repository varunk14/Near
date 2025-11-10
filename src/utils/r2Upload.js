import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Get R2 configuration from environment variables
const getR2Client = () => {
  const accountId = import.meta.env.VITE_R2_ACCOUNT_ID
  const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID
  const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 configuration is missing. Please check your environment variables.')
  }

  // Cloudflare R2 is S3-compatible, so we can use the AWS SDK
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // Force path-style addressing for R2 compatibility
    forcePathStyle: true,
  })
}

export async function uploadToR2(blob, filename) {
  const bucketName = import.meta.env.VITE_R2_BUCKET_NAME

  if (!bucketName) {
    throw new Error('R2 bucket name is missing. Please check your environment variables.')
  }

  const s3Client = getR2Client()

  try {
    // Convert Blob to ArrayBuffer for AWS SDK v3 browser compatibility
    const arrayBuffer = await blob.arrayBuffer()

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: arrayBuffer,
      ContentType: 'video/webm',
    })

    await s3Client.send(command)
    console.log(`Successfully uploaded ${filename} to R2`)
  } catch (error) {
    console.error('Error uploading to R2:', error)
    
    // Provide helpful error messages
    if (error.message.includes('fetch') || error.message.includes('CORS') || error.code === 'NetworkingError') {
      throw new Error(
        `CORS error: Please configure CORS on your R2 bucket. See CORS_SETUP.md for instructions. Original error: ${error.message}`
      )
    }
    
    throw new Error(`Failed to upload file: ${error.message}`)
  }
}

