import type { MetadataRoute } from 'next'
import { sql } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'

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
    // Una sola consulta con JOIN en vez de una por proyecto: con 500
    // proyectos, el patrón anterior eran 500 viajes a la base cada vez que
    // un buscador pedía el sitemap.
    const rows = (await publicDb.execute(sql`
      select
        p.slug         as project_slug,
        p.updated_at   as project_updated,
        u.code         as unit_code,
        u.updated_at   as unit_updated
      from projects p
      left join units u
        on u.project_id = p.id and u.status = 'available'
      where p.status = 'published'
      order by p.slug
    `)) as any

    const projectSeen = new Map<string, Date>()
    const unitPages: MetadataRoute.Sitemap = []

    for (const row of rows.rows ?? []) {
      if (!projectSeen.has(row.project_slug)) {
        projectSeen.set(row.project_slug, new Date(row.project_updated))
      }
      if (row.unit_code) {
        unitPages.push({
          url: `${base}/${row.project_slug}/unidad/${encodeURIComponent(row.unit_code)}`,
          lastModified: new Date(row.unit_updated),
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }

    const projectPages: MetadataRoute.Sitemap = Array.from(projectSeen.entries()).map(
      ([slug, updated]) => ({
        url: `${base}/${slug}`,
        lastModified: updated,
        changeFrequency: 'daily' as const,
        priority: 0.9,
      })
    )

    return [...staticPages, ...projectPages, ...unitPages]
  } catch (error) {
    // Un sitemap incompleto es mejor que un 500: el buscador reintenta.
    console.error('Error generando sitemap:', error)
    return staticPages
  }
}
