import { finishOptions } from '@/server/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

export interface FinishOption {
  id: string
  category: string
  name: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
}

/** Categorías típicas de una preventa argentina. */
export const FINISH_CATEGORIES = [
  'Pisos',
  'Cocina',
  'Baños',
  'Aberturas',
  'Muros',
  'Amenities',
] as const

export async function listFinishes(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.finishOptions.findMany({
      where: and(
        eq(finishOptions.tenantId, tenantId),
        eq(finishOptions.projectId, projectId)
      ),
      orderBy: [asc(finishOptions.category), asc(finishOptions.sortOrder)],
    })
  )
}

/** Storefront: sólo salen si el proyecto está publicado (política RLS). */
export async function listPublicFinishes(projectId: string) {
  return publicDb.query.finishOptions.findMany({
    where: eq(finishOptions.projectId, projectId),
    orderBy: [asc(finishOptions.category), asc(finishOptions.sortOrder)],
  })
}

export async function createFinish(
  tenantId: string,
  projectId: string,
  data: {
    category: string
    name: string
    description?: string
    imageUrl?: string
    storageKey?: string
  }
) {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .insert(finishOptions)
      .values({ tenantId, projectId, ...data })
      .returning()
    return row
  })
}

export async function deleteFinish(tenantId: string, finishId: string) {
  return withTenant(tenantId, (tx) =>
    tx
      .delete(finishOptions)
      .where(
        and(eq(finishOptions.id, finishId), eq(finishOptions.tenantId, tenantId))
      )
  )
}

/** Agrupa por categoría para el comparador de la página pública. */
export function groupByCategory(items: { category: string }[]) {
  const groups = new Map<string, typeof items>()
  for (const item of items) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return Array.from(groups.entries()).map(([category, options]) => ({
    category,
    options,
  }))
}
