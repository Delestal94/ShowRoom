import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import {
  generateUploadUrl,
  createBucketIfNotExists,
  isAllowedUpload,
  UPLOAD_RULES,
  type UploadKind,
} from '@/modules/storage/supabase-client'
import { getProject } from '@/modules/projects/project-service'
import { canManageContent } from '@/modules/tenancy/permissions'

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

  const { projectId, tourKind, fileName, mimeType, fileSize } = await request.json().catch(() => ({}))

  if (!projectId || !tourKind || !fileName || !mimeType || fileSize === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, tourKind, fileName' },
      { status: 400 }
    )
  }

  if (!(tourKind in UPLOAD_RULES)) {
    return NextResponse.json({ error: 'Invalid tour kind' }, { status: 400 })
  }
  if (!canManageContent(tenant.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isAllowedUpload(tourKind as UploadKind, String(fileName), String(mimeType), Number(fileSize))) {
    return NextResponse.json({ error: 'File type, extension, or size is not allowed for this upload.' }, { status: 400 })
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
      fileType: tourKind as UploadKind,
    })

    return NextResponse.json({
      presignedUrl: uploadUrl,
      storageKey,
      cdnUrl,
      maxSize: UPLOAD_RULES[tourKind as UploadKind].maxSize,
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 })
  }
}
