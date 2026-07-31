import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { createProject, listProjects } from '@/modules/projects/project-service'

export async function POST(
  request: Request,
  { params }: { params: { tenantSlug: string } }
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

    const { name, slug, address, geo } = await request.json()

    if (!name || !slug) {
      return Response.json(
        { error: 'Missing required fields: name, slug' },
        { status: 400 }
      )
    }

    const project = await createProject(tenant.id, {
      name,
      slug: slug.toLowerCase(),
      address,
      geo,
    })

    return Response.json({ projectId: project.id })
  } catch (error) {
    console.error('Error creating project:', error)
    return Response.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { tenantSlug: string } }
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

    const projects = await listProjects(tenant.id)
    return Response.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return Response.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
