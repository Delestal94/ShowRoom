import { unstable_cache, revalidateTag } from 'next/cache'
import { eq, and, isNotNull } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'
import {
  projects,
  units,
  tours,
  constructionUpdates,
  finishOptions,
} from '@/server/db/schema'

/**
 * Capa de lectura cacheada del storefront público.
 *
 * La página no puede cachearse entera porque usa searchParams (?ref=,
 * ?embed=), lo que la vuelve dinámica. Así que se cachea el acceso a datos,
 * que es lo caro: sin esto cada visita a un proyecto pega a Postgres, y un
 * proyecto que se comparte mucho satura la conexión.
 *
 * La invalidación es por etiqueta y explícita desde el panel, con un TTL
 * corto como red de seguridad: si alguna vez se olvida invalidar, el caché
 * se corrige solo en un minuto en vez de quedar viejo para siempre.
 */

const TTL_SECONDS = 60

export function projectTag(slug: string) {
  return `project:${slug}`
}

/** Se llama al publicar, editar, o tocar unidades, tours y secciones. */
export function invalidateProject(slug: string) {
  revalidateTag(projectTag(slug))
}

export const getCachedProject = (slug: string) =>
  unstable_cache(
    async () =>
      publicDb.query.projects.findFirst({
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
          amenitiesJson: true,
          financingJson: true,
        },
        with: {
          tenant: {
            columns: { name: true, contactWhatsapp: true, portfolioJson: true },
          },
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
      }),
    ['storefront-project', slug],
    { tags: [projectTag(slug)], revalidate: TTL_SECONDS }
  )()

/**
 * Todo el contenido secundario del proyecto en una sola entrada de caché.
 *
 * Van juntos a propósito: se piden siempre los cuatro para armar la misma
 * página, así que separarlos sólo multiplicaría las claves sin ahorrar nada.
 */
export const getCachedProjectContent = (projectId: string, slug: string) =>
  unstable_cache(
    async () => {
      const [tourRows, updateRows, finishRows] = await Promise.all([
        publicDb.query.tours.findMany({
          where: eq(tours.projectId, projectId),
          orderBy: (t) => [t.createdAt],
        }),
        publicDb.query.constructionUpdates.findMany({
          where: and(
            eq(constructionUpdates.projectId, projectId),
            isNotNull(constructionUpdates.publishedAt)
          ),
          orderBy: (u, { desc }) => [desc(u.publishedAt)],
        }),
        publicDb.query.finishOptions.findMany({
          where: eq(finishOptions.projectId, projectId),
          orderBy: (f, { asc }) => [asc(f.category), asc(f.sortOrder)],
        }),
      ])

      return { tours: tourRows, updates: updateRows, finishes: finishRows }
    },
    ['storefront-content', projectId],
    { tags: [projectTag(slug)], revalidate: TTL_SECONDS }
  )()

export const getCachedUnit = (projectId: string, code: string, slug: string) =>
  unstable_cache(
    async () =>
      publicDb.query.units.findFirst({
        where: and(eq(units.projectId, projectId), eq(units.code, code)),
      }),
    ['storefront-unit', projectId, code],
    { tags: [projectTag(slug)], revalidate: TTL_SECONDS }
  )()

export const getCachedUnitTours = (unitId: string, slug: string) =>
  unstable_cache(
    async () =>
      publicDb.query.tours.findMany({
        where: eq(tours.unitId, unitId),
        orderBy: (t) => [t.createdAt],
      }),
    ['storefront-unit-tours', unitId],
    { tags: [projectTag(slug)], revalidate: TTL_SECONDS }
  )()

export const getCachedSiblings = (projectId: string, slug: string) =>
  unstable_cache(
    async () =>
      publicDb.query.units.findMany({
        where: eq(units.projectId, projectId),
        columns: { code: true, status: true, m2: true },
        orderBy: (u, { asc }) => [asc(u.code)],
      }),
    ['storefront-siblings', projectId],
    { tags: [projectTag(slug)], revalidate: TTL_SECONDS }
  )()
