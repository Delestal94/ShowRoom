import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { canEditFloorPlans } from '@/modules/tenancy/permissions'
import { getProject } from '@/modules/projects/project-service'
import {
  createFloorPlan,
  listFloorPlansByProject,
  type FloorPlanSourceKind,
} from '@/modules/floor-plans/floor-plan-service'

const VALID_SOURCE_KINDS: FloorPlanSourceKind[] = ['image', 'pdf']

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

  const plans = await listFloorPlansByProject(tenant.tenantId, params.projectId)
  return NextResponse.json({ floorPlans: plans })
}

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
  if (!canEditFloorPlans(tenant.role)) {
    return NextResponse.json(
      { error: 'Tu rol no puede crear ni editar plantas' },
      { status: 403 }
    )
  }

  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { name, level, sourceStorageKey, sourceCdnUrl, sourceKind } = await request
    .json()
    .catch(() => ({}))

  if (!name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
  }
  if (sourceKind && !VALID_SOURCE_KINDS.includes(sourceKind)) {
    return NextResponse.json({ error: 'Invalid sourceKind' }, { status: 400 })
  }

  try {
    const plan = await createFloorPlan(tenant.tenantId, params.projectId, {
      name,
      level: level !== undefined && level !== null ? Number(level) : undefined,
      sourceStorageKey,
      sourceCdnUrl,
      sourceKind,
    })
    return NextResponse.json({ floorPlan: plan }, { status: 201 })
  } catch (error) {
    console.error('Error creating floor plan:', error)
    return NextResponse.json({ error: 'Failed to create floor plan' }, { status: 500 })
  }
}
