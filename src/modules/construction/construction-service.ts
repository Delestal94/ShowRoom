import { constructionUpdates, projects } from '@/server/db/schema'
import { eq, and, desc, isNotNull } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

export interface UpdateImage {
  storageKey: string
  cdnUrl: string
}

export interface CreateUpdateInput {
  title: string
  body?: string
  progressPercent?: number
  images?: UpdateImage[]
  publish?: boolean
}

export async function listUpdates(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.constructionUpdates.findMany({
      where: and(
        eq(constructionUpdates.tenantId, tenantId),
        eq(constructionUpdates.projectId, projectId)
      ),
      orderBy: desc(constructionUpdates.createdAt),
    })
  )
}

/**
 * Storefront view. Runs without tenant context, so the RLS policy only
 * returns rows that are published *and* belong to a published project.
 */
export async function listPublicUpdates(projectId: string) {
  return publicDb.query.constructionUpdates.findMany({
    where: and(
      eq(constructionUpdates.projectId, projectId),
      isNotNull(constructionUpdates.publishedAt)
    ),
    orderBy: desc(constructionUpdates.publishedAt),
  })
}

export async function getUpdate(tenantId: string, updateId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.constructionUpdates.findFirst({
      where: and(
        eq(constructionUpdates.id, updateId),
        eq(constructionUpdates.tenantId, tenantId)
      ),
    })
  )
}

export async function createUpdate(
  tenantId: string,
  projectId: string,
  input: CreateUpdateInput
) {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .insert(constructionUpdates)
      .values({
        tenantId,
        projectId,
        title: input.title,
        body: input.body,
        progressPercent: input.progressPercent,
        imagesJson: input.images ?? [],
        publishedAt: input.publish ? new Date() : null,
      })
      .returning()
    return row
  })
}

export async function togglePublishUpdate(tenantId: string, updateId: string) {
  return withTenant(tenantId, async (tx) => {
    const current = await tx.query.constructionUpdates.findFirst({
      where: and(
        eq(constructionUpdates.id, updateId),
        eq(constructionUpdates.tenantId, tenantId)
      ),
      columns: { publishedAt: true },
    })
    if (!current) return undefined

    const [row] = await tx
      .update(constructionUpdates)
      .set({
        publishedAt: current.publishedAt ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(constructionUpdates.id, updateId),
          eq(constructionUpdates.tenantId, tenantId)
        )
      )
      .returning()
    return row
  })
}

export async function markNotified(tenantId: string, updateId: string) {
  return withTenant(tenantId, (tx) =>
    tx
      .update(constructionUpdates)
      .set({ notifiedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(constructionUpdates.id, updateId),
          eq(constructionUpdates.tenantId, tenantId)
        )
      )
  )
}

export async function deleteUpdate(tenantId: string, updateId: string) {
  return withTenant(tenantId, (tx) =>
    tx
      .delete(constructionUpdates)
      .where(
        and(
          eq(constructionUpdates.id, updateId),
          eq(constructionUpdates.tenantId, tenantId)
        )
      )
  )
}

/** Latest published progress percentage, for the project header. */
export async function getLatestProgress(projectId: string): Promise<number | null> {
  const [latest] = await publicDb.query.constructionUpdates.findMany({
    where: and(
      eq(constructionUpdates.projectId, projectId),
      isNotNull(constructionUpdates.publishedAt)
    ),
    orderBy: desc(constructionUpdates.publishedAt),
    limit: 1,
    columns: { progressPercent: true },
  })
  return latest?.progressPercent ?? null
}

export async function getProjectForUpdate(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)),
      columns: { id: true, name: true, slug: true, status: true },
    })
  )
}
