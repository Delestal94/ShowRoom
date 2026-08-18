import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { createProject, listProjects } from '@/modules/projects/project-service'

export async function GET() {
  try {
    const tenant = await requireCurrentTenant()
    const projects = await listProjects(tenant.tenantId)
    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, slug, address, geo } = await request.json().catch(() => ({}))

  if (!name || !slug) {
    return NextResponse.json(
      { error: 'Missing required fields: name, slug' },
      { status: 400 }
    )
  }

  try {
    const project = await createProject(tenant.tenantId, {
      name,
      slug: String(slug).toLowerCase(),
      address,
      geo,
    })
    return NextResponse.json({ projectId: project.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
