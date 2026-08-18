import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { generateUploadUrl, createBucketIfNotExists } from '@/modules/storage/supabase-client'
import { getProject } from '@/modules/projects/project-service'

const MAX_SIZES: Record<string, number> = {
  'glb-model': 50 * 1024 * 1024, // 50MB
  '360': 100 * 1024 * 1024, // 100MB
  image: 100 * 1024 * 1024, // 100MB
  'drone-video': 500 * 1024 * 1024, // 500MB
}

export async function POST(request: Request) {
  // The tenant comes from the signed-in session, never from the request
  // body — trusting a client-supplied tenantSlug would let anyone request
  // an upload URL scoped to another tenant's storage prefix.
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, tourKind, fileName } = await request.json().catch(() => ({}))

  if (!projectId || !tourKind || !fileName) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, tourKind, fileName' },
      { status: 400 }
    )
  }

  if (!(tourKind in MAX_SIZES)) {
    return NextResponse.json({ error: 'Invalid tour kind' }, { status: 400 })
  }

  const project = await getProject(tenant.tenantId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  try {
    await createBucketIfNotExists()

    const { uploadUrl, storageKey, cdnUrl } = await generateUploadUrl({
      tenantId: tenant.tenantId,
      projectId,
      fileName,
      fileType: tourKind as 'glb' | '360' | 'video' | 'image',
    })

    return NextResponse.json({
      presignedUrl: uploadUrl,
      storageKey,
      cdnUrl,
      maxSize: MAX_SIZES[tourKind],
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 })
  }
}
