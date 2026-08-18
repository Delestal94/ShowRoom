import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { createTour, listToursByProject, type TourKind } from '@/modules/tours/tour-service'
import { getProject } from '@/modules/projects/project-service'

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

  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { kind, unitId, storageKey, cdnUrl } = await request.json().catch(() => ({}))

  if (!kind || !storageKey || !cdnUrl) {
    return NextResponse.json(
      { error: 'Missing required fields: kind, storageKey, cdnUrl' },
      { status: 400 }
    )
  }
  if (!VALID_KINDS.includes(kind as TourKind)) {
    return NextResponse.json({ error: 'Invalid tour kind' }, { status: 400 })
  }

  try {
    const tour = await createTour(tenant.tenantId, params.projectId, {
      unitId,
      kind,
      storageKey,
      cdnUrl,
      metadata: { uploadedAt: new Date().toISOString() },
    })

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

  const tours = await listToursByProject(tenant.tenantId, params.projectId)
  return NextResponse.json({ tours })
}
