import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { generateUploadUrl, createBucketIfNotExists } from '@/modules/storage/supabase-client'
import { getProject } from '@/modules/projects/project-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantSlug, projectId, tourKind, fileName } = body

    if (!tenantSlug || !projectId || !tourKind || !fileName) {
      return Response.json(
        { error: 'Missing required fields: tenantSlug, projectId, tourKind, fileName' },
        { status: 400 }
      )
    }

    // Validate tenant
    const headersList = await headers()
    const headerTenantSlug = headersList.get('x-tenant-slug')
    if (headerTenantSlug !== tenantSlug) {
      return Response.json({ error: 'Invalid tenant' }, { status: 403 })
    }

    const tenant = await getTenantFromSlug(tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Validate project belongs to tenant
    const project = await getProject(tenant.id, projectId)
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    // Validate tour kind
    const validKinds = ['360', 'glb-model', 'drone-video', 'image']
    if (!validKinds.includes(tourKind)) {
      return Response.json({ error: 'Invalid tour kind' }, { status: 400 })
    }

    // Validate file size based on kind
    const maxSizes: Record<string, number> = {
      'glb-model': 50 * 1024 * 1024, // 50MB
      '360': 100 * 1024 * 1024, // 100MB
      'image': 100 * 1024 * 1024, // 100MB
      'drone-video': 500 * 1024 * 1024, // 500MB
    }

    // Ensure bucket exists
    await createBucketIfNotExists()

    // Generate upload URL with Supabase
    const { uploadUrl, storageKey, cdnUrl } = await generateUploadUrl({
      tenantId: tenant.id,
      projectId,
      fileName,
      fileType: tourKind as 'glb' | '360' | 'video' | 'image',
    })

    return Response.json({
      presignedUrl: uploadUrl,
      storageKey,
      cdnUrl,
      maxSize: maxSizes[tourKind],
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return Response.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}
