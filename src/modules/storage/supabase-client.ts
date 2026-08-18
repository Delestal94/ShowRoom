import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export interface UploadInput {
  tenantId: string
  projectId: string
  fileName: string
  fileType: 'glb' | '360' | 'video' | 'image'
}

export async function generateUploadUrl(input: UploadInput) {
  // Create a bucket name (Supabase requires lowercase, no special chars)
  const bucketName = 'showroom-assets'

  // Build storage key path
  const storagePath = `${input.tenantId}/${input.projectId}/${input.fileType}/${input.fileName}`

  // Generate a signed URL for upload (valid for 1 hour)
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(storagePath, {
      upsert: false,
    })

  if (error) {
    console.error('Error generating upload URL:', error)
    throw new Error(`Failed to generate upload URL: ${error.message}`)
  }

  // Get the public URL for the file
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(storagePath)

  return {
    uploadUrl: data.signedUrl,
    storageKey: storagePath,
    cdnUrl: publicUrlData.publicUrl,
  }
}

export async function createBucketIfNotExists() {
  const bucketName = 'showroom-assets'

  try {
    // Try to get the bucket
    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('Error listing buckets:', error)
      return false
    }

    // Check if bucket exists
    const bucketExists = data.some((b) => b.name === bucketName)

    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket(
        bucketName,
        {
          public: true, // Make files publicly accessible
          allowedMimeTypes: [
            'model/gltf-binary', // GLB
            'image/jpeg',
            'image/png',
            'video/mp4',
            'image/x-icon',
          ],
        }
      )

      if (createError) {
        console.error('Error creating bucket:', createError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in bucket creation:', error)
    return false
  }
}
