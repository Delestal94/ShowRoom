import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { createTour, listToursByProject, type TourKind } from '@/modules/tours/tour-service'
import { getProject } from '@/modules/projects/project-service'
import { invalidateProject } from '@/modules/public/cached-storefront'
import { canManageContent } from '@/modules/tenancy/permissions'
import { getPublicAssetUrl, verifyUploadedAsset } from '@/modules/storage/supabase-client'

const VALID_KINDS: TourKind[] = ['360', 'glb-model', 'drone-video', 'image']

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canManageContent(tenant.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { kind, unitId, storageKey } = await request.json().catch(() => ({}))

  if (!kind || !storageKey) {
    return NextResponse.json(
      { error: 'Missing required fields: kind, storageKey, cdnUrl' },
      { status: 400 }
    )
  }
  if (!VALID_KINDS.includes(kind as TourKind)) {
    return NextResponse.json({ error: 'Invalid tour kind' }, { status: 400 })
  }

  const validAsset = await verifyUploadedAsset({
    tenantId: tenant.tenantId,
    projectId: params.projectId,
    kind: kind as TourKind,
    storageKey: String(storageKey),
  })
  if (!validAsset) {
    return NextResponse.json({ error: 'Uploaded file is missing or invalid' }, { status: 400 })
  }

  const cdnUrl = getPublicAssetUrl(String(storageKey))

  try {
    const tour = await createTour(tenant.tenantId, params.projectId, {
      unitId,
      kind,
      storageKey,
      cdnUrl,
      metadata: { uploadedAt: new Date().toISOString() },
    })

    // Un tour nuevo cambia lo que se ve en la página pública.
    invalidateProject(project.slug)

    return NextResponse.json(
      { success: true, tourId: tour.id, storageKey, cdnUrl },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating tour:', error)
    return NextResponse.json({ error: 'Failed to create tour' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canManageContent(tenant.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tours = await listToursByProject(tenant.tenantId, params.projectId)
  return NextResponse.json({ tours })
}
