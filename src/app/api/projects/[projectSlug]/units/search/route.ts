import { db } from '@/server/db/client'
import { projects } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { searchUnits, getFilterOptions } from '@/modules/units/unit-filters'

export async function GET(
  request: Request,
  { params }: { params: { projectSlug: string } }
) {
  try {
    // Find project by slug (public endpoint, no tenant validation)
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, params.projectSlug),
      columns: {
        id: true,
        tenantId: true,
      },
    })

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse filters from query string
    const url = new URL(request.url)
    const minPrice = url.searchParams.get('minPrice')
      ? parseFloat(url.searchParams.get('minPrice')!)
      : undefined
    const maxPrice = url.searchParams.get('maxPrice')
      ? parseFloat(url.searchParams.get('maxPrice')!)
      : undefined
    const minM2 = url.searchParams.get('minM2')
      ? parseFloat(url.searchParams.get('minM2')!)
      : undefined
    const maxM2 = url.searchParams.get('maxM2')
      ? parseFloat(url.searchParams.get('maxM2')!)
      : undefined
    const orientation = url.searchParams.get('orientation') || undefined
    const bedrooms = url.searchParams.get('bedrooms')
      ? parseInt(url.searchParams.get('bedrooms')!)
      : undefined
    const floor = url.searchParams.get('floor')
      ? parseInt(url.searchParams.get('floor')!)
      : undefined
    const status = url.searchParams.get('status') || 'available'
    const search = url.searchParams.get('search') || undefined

    // Search units
    const units = await searchUnits({
      projectId: project.id,
      tenantId: project.tenantId,
      minPrice,
      maxPrice,
      minM2,
      maxM2,
      orientation,
      bedrooms,
      floor,
      status,
      search,
    })

    // Get available filter options from all units in project
    const allUnits = await db.query.units.findMany({
      where: eq(projects.id, project.id),
    })

    const filterOptions = getFilterOptions(allUnits)

    return Response.json({
      units,
      filterOptions,
      count: units.length,
    })
  } catch (error) {
    console.error('Error searching units:', error)
    return Response.json(
      { error: 'Failed to search units' },
      { status: 500 }
    )
  }
}
