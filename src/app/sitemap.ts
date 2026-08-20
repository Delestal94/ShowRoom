import type { MetadataRoute } from 'next'
import { eq, and } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'
import { projects, units } from '@/server/db/schema'
import { getSiteUrl } from '@/lib/site-url'

/**
 * Sitemap dinámico: cada proyecto publicado y cada una de sus unidades es una
 * página propia que puede rankear por su cuenta ("2 ambientes en Almagro").
 *
 * Corre sin contexto de tenant, así que RLS ya filtra: sólo salen proyectos
 * publicados y sus unidades. Un borrador no puede colarse.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl().origin

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
  ]

  try {
    const published = await publicDb.query.projects.findMany({
      where: eq(projects.status, 'published'),
      columns: { id: true, slug: true, updatedAt: true },
    })

    const projectPages: MetadataRoute.Sitemap = published.map((project) => ({
      url: `${base}/${project.slug}`,
      lastModified: project.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }))

    const unitPages: MetadataRoute.Sitemap = []

    for (const project of published) {
      const projectUnits = await publicDb.query.units.findMany({
        where: and(
          eq(units.projectId, project.id),
          // Las vendidas siguen accesibles por link, pero no tiene sentido
          // pedirle a Google que las indexe: no se pueden comprar.
          eq(units.status, 'available')
        ),
        columns: { code: true, updatedAt: true },
      })

      for (const unit of projectUnits) {
        unitPages.push({
          url: `${base}/${project.slug}/unidad/${encodeURIComponent(unit.code)}`,
          lastModified: unit.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }

    return [...staticPages, ...projectPages, ...unitPages]
  } catch (error) {
    // Un sitemap incompleto es mejor que un 500: el buscador reintenta.
    console.error('Error generando sitemap:', error)
    return staticPages
  }
}
