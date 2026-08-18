import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { publicDb as db } from '@/server/db/tenant-db'
import { projects } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { listPublicToursByProject } from '@/modules/tours/tour-service'
import { listPublicUpdates } from '@/modules/construction/construction-service'
import { resolveTrackingCode, registerClick } from '@/modules/brokers/broker-service'
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
      geo: true,
      pointsOfInterestJson: true,
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
  searchParams,
}: {
  params: { projectSlug: string }
  searchParams: { embed?: string; ref?: string }
}) {
  const project = await findPublishedProject(params.projectSlug)

  // A real 404 rather than a 200 with an error message, so unknown slugs
  // aren't treated as valid pages by crawlers or link previews.
  if (!project || project.status !== 'published') {
    notFound()
  }

  // Apertura del link de broker. Se cuenta acá y no en el middleware para
  // no sumar una consulta a la base en cada request del sitio.
  if (searchParams.ref) {
    const link = await resolveTrackingCode(searchParams.ref)
    if (link && link.projectId === project.id) {
      await registerClick(link.id).catch(() => {
        // Un contador que falla no debe tirar abajo la página.
      })
    }
  }

  const [tours, updates] = await Promise.all([
    listPublicToursByProject(project.id),
    listPublicUpdates(project.id),
  ])

  return (
    <StorefrontClient
      projectSlug={project.slug}
      projectName={project.name}
      projectAddress={project.address || ''}
      initialUnits={(project.units || []) as any}
      tours={tours as any}
      whatsappNumber={project.tenant?.contactWhatsapp ?? null}
      geo={project.geo as { lat: number; lng: number } | null}
      pointsOfInterest={
        (project.pointsOfInterestJson ?? []) as { name: string; distance?: string }[]
      }
      embed={searchParams.embed === '1'}
      constructionUpdates={updates as any}
    />
  )
}
