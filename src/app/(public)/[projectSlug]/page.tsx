import { db } from '@/server/db/client'
import { projects } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { listToursByProject } from '@/modules/tours/tour-service'
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

  if (!project || project.status !== 'published') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Project Not Found</h1>
          <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist or is not published yet.</p>
        </div>
      </div>
    )
  }

  // Fetch tours for this project
  const tours = await listToursByProject(project.tenantId, project.id)

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
