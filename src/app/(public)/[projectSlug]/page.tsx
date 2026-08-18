import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { publicDb as db } from '@/server/db/tenant-db'
import { projects } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { listPublicToursByProject } from '@/modules/tours/tour-service'
import { StorefrontClient } from '@/components/storefront-client'

/**
 * Resolved without tenant context: `projects_select` only exposes published
 * rows to anonymous readers, so an unpublished slug simply isn't found.
 */
async function findPublishedProject(slug: string) {
  return db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    columns: {
      id: true,
      name: true,
      slug: true,
      address: true,
      tenantId: true,
      status: true,
    },
    with: {
      tenant: { columns: { name: true, contactWhatsapp: true } },
      units: {
        columns: {
          id: true,
          code: true,
          floor: true,
          m2: true,
          price: true,
          currency: true,
          status: true,
          orientation: true,
          bedrooms: true,
        },
      },
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: { projectSlug: string }
}): Promise<Metadata> {
  const project = await findPublishedProject(params.projectSlug)
  if (!project) return { title: 'Proyecto no encontrado' }

  const description = project.address
    ? `Recorré ${project.name} en ${project.address}. Unidades disponibles con precios y superficies.`
    : `Recorré ${project.name}. Unidades disponibles con precios y superficies.`

  return {
    title: project.name,
    description,
    openGraph: { title: project.name, description, type: 'website' },
  }
}

export default async function StorefrontPage({
  params,
}: {
  params: { projectSlug: string }
}) {
  const project = await findPublishedProject(params.projectSlug)

  // A real 404 rather than a 200 with an error message, so unknown slugs
  // aren't treated as valid pages by crawlers or link previews.
  if (!project || project.status !== 'published') {
    notFound()
  }

  const tours = await listPublicToursByProject(project.id)

  return (
    <StorefrontClient
      projectSlug={project.slug}
      projectName={project.name}
      projectAddress={project.address || ''}
      initialUnits={(project.units || []) as any}
      tours={tours as any}
      whatsappNumber={project.tenant?.contactWhatsapp ?? null}
    />
  )
}
