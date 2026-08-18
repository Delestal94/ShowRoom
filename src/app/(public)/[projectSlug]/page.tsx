import { notFound } from 'next/navigation'
import { publicDb as db } from '@/server/db/tenant-db'
import { projects } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { listPublicToursByProject } from '@/modules/tours/tour-service'
import { StorefrontClient } from '@/components/storefront-client'

export default async function StorefrontPage({
  params,
}: {
  params: { projectSlug: string }
}) {
  // Find project by slug (across all tenants)
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.projectSlug),
    columns: {
      id: true,
      name: true,
      slug: true,
      address: true,
      tenantId: true,
      status: true,
    },
    with: {
      units: {
        columns: {
          id: true,
          code: true,
          floor: true,
          m2: true,
          price: true,
          status: true,
          orientation: true,
          bedrooms: true,
        },
      },
    },
  })

  // Render a real 404 rather than a 200 with an error message, so unknown
  // slugs aren't treated as valid pages by crawlers or link previews.
  if (!project || project.status !== 'published') {
    notFound()
  }

  // Fetch tours for this project
  const tours = await listPublicToursByProject(project.id)

  return (
    <StorefrontClient
      projectSlug={project.slug}
      projectName={project.name}
      projectAddress={project.address || ''}
      initialUnits={(project.units || []) as any}
      tours={tours as any}
    />
  )
}
