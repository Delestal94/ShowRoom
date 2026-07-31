import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { getR2Client } from '@/modules/storage/r2-client'
import { getProject } from '@/modules/projects/project-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantSlug, projectId, tourKind, fileName, contentType } = body

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

    // Get R2 client
    const r2 = getR2Client()

    // Build storage key
    const storageKey = r2.buildStorageKey(
      tenant.id,
      projectId,
      tourKind,
      fileName
    )

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = r2.generatePresignedUrl(
      storageKey,
      contentType || 'application/octet-stream',
      3600
    )

    // Get CDN URL for later
    const cdnUrl = r2.getCdnUrl(storageKey)

    return Response.json({
      presignedUrl,
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
