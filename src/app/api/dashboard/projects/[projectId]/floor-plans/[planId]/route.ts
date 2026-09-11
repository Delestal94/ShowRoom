import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { canEditFloorPlans } from '@/modules/tenancy/permissions'
import {
  deleteFloorPlan,
  getFloorPlan,
  updateFloorPlanModel,
} from '@/modules/floor-plans/floor-plan-service'

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string; planId: string } }
) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getFloorPlan(tenant.tenantId, params.planId)
  if (!plan || plan.projectId !== params.projectId) {
    return NextResponse.json({ error: 'Floor plan not found' }, { status: 404 })
  }

  return NextResponse.json({ floorPlan: plan })
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string; planId: string } }
) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canEditFloorPlans(tenant.role)) {
    return NextResponse.json(
      { error: 'Tu rol no puede editar plantas' },
      { status: 403 }
    )
  }

  const { modelJson, pxPerMeter, name, level } = await request.json().catch(() => ({}))

  if (modelJson === undefined) {
    return NextResponse.json({ error: 'Missing required field: modelJson' }, { status: 400 })
  }

  try {
    const updated = await updateFloorPlanModel(tenant.tenantId, params.planId, {
      modelJson,
      pxPerMeter,
      name,
      level,
    })
    if (!updated) {
      return NextResponse.json({ error: 'Floor plan not found' }, { status: 404 })
    }
    return NextResponse.json({ floorPlan: updated })
  } catch (error) {
    console.error('Error saving floor plan:', error)
    return NextResponse.json({ error: 'Failed to save floor plan' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string; planId: string } }
) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canEditFloorPlans(tenant.role)) {
    return NextResponse.json(
      { error: 'Tu rol no puede borrar plantas' },
      { status: 403 }
    )
  }

  try {
    await deleteFloorPlan(tenant.tenantId, params.planId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting floor plan:', error)
    return NextResponse.json({ error: 'Failed to delete floor plan' }, { status: 500 })
  }
}
