import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { canEditFloorPlans } from '@/modules/tenancy/permissions'
import { getProject } from '@/modules/projects/project-service'
import { publishFloorPlan } from '@/modules/floor-plans/floor-plan-service'
import { invalidateProject } from '@/modules/public/cached-storefront'
import { getPublicAssetUrl, verifyUploadedAsset } from '@/modules/storage/supabase-client'

export async function POST(
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
      { error: 'Tu rol no puede publicar plantas' },
      { status: 403 }
    )
  }

  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { storageKey } = await request.json().catch(() => ({}))
  if (!storageKey) {
    return NextResponse.json(
      { error: 'Missing required fields: storageKey, cdnUrl' },
      { status: 400 }
    )
  }

  const validAsset = await verifyUploadedAsset({
    tenantId: tenant.tenantId,
    projectId: params.projectId,
    kind: 'glb-model',
    storageKey: String(storageKey),
  })
  if (!validAsset) {
    return NextResponse.json({ error: 'Uploaded GLB is missing or invalid' }, { status: 400 })
  }

  try {
    const plan = await publishFloorPlan(tenant.tenantId, params.planId, {
      projectId: params.projectId,
      storageKey,
      cdnUrl: getPublicAssetUrl(String(storageKey)),
    })
    if (!plan) {
      return NextResponse.json({ error: 'Floor plan not found' }, { status: 404 })
    }

    // El GLB publicado cambia lo que se ve en la página pública del proyecto.
    invalidateProject(project.slug)

    return NextResponse.json({ floorPlan: plan })
  } catch (error) {
    console.error('Error publishing floor plan:', error)
    return NextResponse.json({ error: 'Failed to publish floor plan' }, { status: 500 })
  }
}
