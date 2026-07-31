import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { createTour, listToursByProject } from '@/modules/tours/tour-service'
import { getProject } from '@/modules/projects/project-service'

export async function POST(
  request: Request,
  { params }: { params: { tenantSlug: string; projectId: string } }
) {
  try {
    const headersList = await headers()
    const tenantSlug = headersList.get('x-tenant-slug')

    if (tenantSlug !== params.tenantSlug) {
      return Response.json({ error: 'Invalid tenant' }, { status: 403 })
    }

    const tenant = await getTenantFromSlug(params.tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const project = await getProject(tenant.id, params.projectId)
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const { kind, unitId, storageKey, cdnUrl } = body

    if (!kind || !storageKey || !cdnUrl) {
      return Response.json(
        { error: 'Missing required fields: kind, storageKey, cdnUrl' },
        { status: 400 }
      )
    }

    // Validate tour kind
    const validKinds = ['360', 'glb-model', 'drone-video', 'image']
    if (!validKinds.includes(kind)) {
      return Response.json({ error: 'Invalid tour kind' }, { status: 400 })
    }

    // Create tour record in database with CDN URL ready
    const tour = await createTour(tenant.id, params.projectId, {
      unitId,
      kind: kind as any,
      storageKey,
      cdnUrl,
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    })

    return Response.json({
      success: true,
      tourId: tour.id,
      storageKey,
      cdnUrl,
      message: 'Tour uploaded successfully',
    })
  } catch (error) {
    console.error('Error creating tour:', error)
    return Response.json(
      { error: 'Failed to create tour' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { tenantSlug: string; projectId: string } }
) {
  try {
    const headersList = await headers()
    const tenantSlug = headersList.get('x-tenant-slug')

    if (tenantSlug !== params.tenantSlug) {
      return Response.json({ error: 'Invalid tenant' }, { status: 403 })
    }

    const tenant = await getTenantFromSlug(params.tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const tours = await listToursByProject(tenant.id, params.projectId)
    return Response.json({ tours })
  } catch (error) {
    console.error('Error fetching tours:', error)
    return Response.json(
      { error: 'Failed to fetch tours' },
      { status: 500 }
    )
  }
}
