import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export interface UploadInput {
  tenantId: string
  projectId: string
  fileName: string
  fileType: 'glb-model' | '360' | 'drone-video' | 'image'
}

export const UPLOAD_RULES = {
  'glb-model': { maxSize: 50 * 1024 * 1024, extensions: ['.glb'], mimeTypes: ['model/gltf-binary', 'application/octet-stream'] },
  '360': { maxSize: 100 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png'], mimeTypes: ['image/jpeg', 'image/png'] },
  image: { maxSize: 100 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp'], mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'drone-video': { maxSize: 500 * 1024 * 1024, extensions: ['.mp4', '.webm'], mimeTypes: ['video/mp4', 'video/webm'] },
} as const

export type UploadKind = keyof typeof UPLOAD_RULES
const BUCKET_NAME = 'showroom-assets'
const ALLOWED_MIME_TYPES = [
  'model/gltf-binary',
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
]

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : ''
}

export function isAllowedUpload(kind: UploadKind, fileName: string, mimeType: string, fileSize: number) {
  const rule = UPLOAD_RULES[kind]
  return (
    Number.isSafeInteger(fileSize) && fileSize > 0 && fileSize <= rule.maxSize &&
    rule.extensions.includes(extensionOf(fileName) as never) &&
    rule.mimeTypes.includes(mimeType as never)
  )
}

/** Confirms the object actually uploaded to Storage still matches its signed-upload policy. */
export async function verifyUploadedAsset(input: {
  tenantId: string
  projectId: string
  kind: UploadKind
  storageKey: string
}) {
  const prefix = `${input.tenantId}/${input.projectId}/${input.kind}/`
  if (!input.storageKey.startsWith(prefix)) return false

  const name = input.storageKey.slice(prefix.length)
  if (!name || name.includes('/')) return false
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(prefix.slice(0, -1), { search: name })
  if (error) return false
  const object = data.find((item) => item.name === name)
  const metadata = object?.metadata as { size?: number; mimetype?: string } | undefined
  return Boolean(metadata && isAllowedUpload(input.kind, name, metadata.mimetype ?? '', Number(metadata.size)))
}

export function getPublicAssetUrl(storageKey: string) {
  return supabase.storage.from(BUCKET_NAME).getPublicUrl(storageKey).data.publicUrl
}

/**
 * Reduce un nombre de archivo a algo seguro para usar como último segmento
 * de una ruta de storage.
 *
 * Sin esto, un `fileName` como "../../otro-tenant/x.png" escapa del prefijo
 * del tenant y permite escribir en el espacio de otro. El nombre lo elige
 * quien sube el archivo, así que nunca puede ir directo a la ruta.
 */
function safeFileName(raw: string): string {
  const base = raw
    .split(/[/\\]/) // descarta cualquier componente de directorio
    .pop()!
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^\.+/, '') // evita nombres ocultos y ".."
    .slice(-120)

  return base || `archivo-${Date.now()}`
}

export async function generateUploadUrl(input: UploadInput) {
  // Create a bucket name (Supabase requires lowercase, no special chars)
  const bucketName = BUCKET_NAME

  // El prefijo lo arma el servidor con ids que ya validó; sólo el nombre
  // final viene del cliente, y va saneado.
  const storagePath = `${input.tenantId}/${input.projectId}/${input.fileType}/${safeFileName(input.fileName)}`

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
  const bucketName = BUCKET_NAME

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
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        }
      )

      if (createError) {
        console.error('Error creating bucket:', createError)
        return false
      }
    } else {
      // Existing buckets keep their old allow-list unless explicitly updated.
      // Keep it aligned with the formats exposed by the upload UI.
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      })
      if (updateError) {
        console.error('Error updating bucket policy:', updateError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in bucket creation:', error)
    return false
  }
}
