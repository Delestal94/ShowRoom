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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const kind = (formData.get('kind') as string) || 'image'
    const unitId = (formData.get('unitId') as string) || undefined

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    const maxSize = kind === 'glb-model' ? 50 * 1024 * 1024 : 100 * 1024 * 1024
    if (file.size > maxSize) {
      return Response.json(
        { error: `File too large (max ${maxSize / 1024 / 1024}MB)` },
        { status: 413 }
      )
    }

    // For MVP: generate a unique storage key
    // In production, this would upload to R2 and get back a CDN URL
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const storageKey = `tours/${tenant.id}/${params.projectId}/${timestamp}-${randomId}-${file.name}`

    // Create tour record in database with processing status
    const tour = await createTour(tenant.id, params.projectId, {
      unitId,
      kind: kind as any,
      storageKey,
      cdnUrl: undefined, // Will be set once R2 upload completes
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      },
    })

    // TODO: In Phase 2, upload to R2 and update tour.cdnUrl
    // For now, tours are stored locally and marked as processing

    return Response.json({
      success: true,
      tourId: tour.id,
      storageKey,
      message: 'Tour uploaded successfully. Processing...',
    })
  } catch (error) {
    console.error('Error uploading tour:', error)
    return Response.json(
      { error: 'Failed to upload tour' },
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
