import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import {
  getCachedProject,
  getCachedProjectContent,
} from '@/modules/public/cached-storefront'
import { notFound } from 'next/navigation'





import { resolveTrackingCode, registerClick } from '@/modules/brokers/broker-service'

import { StorefrontClient } from '@/components/storefront-client'
import { ProjectJsonLd, BreadcrumbJsonLd } from '@/components/json-ld'

/**
 * Resolved without tenant context: `projects_select` only exposes published
 * rows to anonymous readers, so an unpublished slug simply isn't found.
 */
/**
 * Lectura cacheada: cada visita a un proyecto compartido no debería pegarle
 * a Postgres. RLS ya filtra por publicado, así que un borrador no se cachea
 * ni se sirve.
 */
async function findPublishedProject(slug: string) {
  return getCachedProject(slug)
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { projectSlug: string }
  searchParams: { embed?: string }
}): Promise<Metadata> {
  const project = await findPublishedProject(params.projectSlug)
  if (!project) return { title: 'Proyecto no encontrado' }

  const description = project.address
    ? `Recorré ${project.name} en ${project.address}. Unidades disponibles con precios y superficies.`
    : `Recorré ${project.name}. Unidades disponibles con precios y superficies.`

  const canonical = new URL(`/${project.slug}`, getSiteUrl()).toString()

  return {
    title: project.name,
    description,
    // Canónica explícita: el mismo proyecto es alcanzable con ?ref= de cada
    // broker y con ?embed=1, y sin esto cada variante compite consigo misma.
    alternates: { canonical },
    // La versión embebida es la misma página sin chrome: indexarla sería
    // contenido duplicado compitiendo contra la original.
    ...(searchParams.embed === '1' ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: project.name, description, type: 'website', url: canonical },
    twitter: { card: 'summary_large_image', title: project.name, description },
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

  const { tours, updates, finishes } = await getCachedProjectContent(
    project.id,
    project.slug
  )

  const base = getSiteUrl()
  const canonical = new URL(`/${project.slug}`, base).toString()

  const prices = (project.units ?? [])
    .filter((u) => u.status === 'available')
    .map((u) => Number(u.price))
    .filter((n) => Number.isFinite(n) && n > 0)

  return (
    <>
      <ProjectJsonLd
        name={project.name}
        description={
          project.address
            ? `${project.name} en ${project.address}. Unidades en preventa con recorrido 3D.`
            : `${project.name}. Unidades en preventa con recorrido 3D.`
        }
        url={canonical}
        address={project.address}
        geo={project.geo as { lat: number; lng: number } | null}
        developerName={project.tenant?.name}
        imageUrl={`${canonical}/opengraph-image`}
        priceRange={
          prices.length > 0
            ? {
                min: Math.min(...prices),
                max: Math.max(...prices),
                currency: project.units?.[0]?.currency ?? 'USD',
              }
            : null
        }
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Inicio', url: base.origin },
          { name: project.name, url: canonical },
        ]}
      />
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
      finishes={finishes as any}
      amenities={(project.amenitiesJson ?? []) as any}
      financing={(project.financingJson ?? []) as any}
      portfolio={(project.tenant?.portfolioJson ?? []) as any}
      developerName={project.tenant?.name}
    />
    </>
  )
}
