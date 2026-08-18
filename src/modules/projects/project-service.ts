import { projects } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { withTenant } from '@/server/db/tenant-db'

export async function createProject(
  tenantId: string,
  data: {
    name: string
    slug: string
    address?: string
    geo?: { lat: number; lng: number }
  }
) {
  return withTenant(tenantId, async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({ tenantId, ...data })
      .returning()
    return project
  })
}

export async function getProject(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)),
      with: { units: true },
    })
  )
}

export async function listProjects(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.projects.findMany({
      where: eq(projects.tenantId, tenantId),
      with: {
        units: {
          columns: { id: true, code: true, status: true },
        },
      },
      orderBy: (p) => [p.createdAt],
    })
  )
}

export async function updateProject(
  tenantId: string,
  projectId: string,
  data: Partial<{
    name: string
    slug: string
    address: string
    status: string
  }>
) {
  return withTenant(tenantId, async (tx) => {
    const [updated] = await tx
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)))
      .returning()
    return updated
  })
}

export async function deleteProject(tenantId: string, projectId: string) {
  return withTenant(tenantId, async (tx) => {
    await tx
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)))
  })
}
