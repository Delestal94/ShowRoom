import { db } from '@/server/db/client'
import { projects } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'

export async function createProject(
  tenantId: string,
  data: {
    name: string
    slug: string
    address?: string
    geo?: { lat: number; lng: number }
  }
) {
  const [project] = await db
    .insert(projects)
    .values({
      tenantId,
      ...data,
    })
    .returning()

  return project
}

export async function getProject(tenantId: string, projectId: string) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.tenantId, tenantId)
    ),
    with: {
      units: true,
    },
  })

  return project
}

export async function listProjects(tenantId: string) {
  return db.query.projects.findMany({
    where: eq(projects.tenantId, tenantId),
    with: {
      units: {
        columns: { id: true, code: true, status: true },
      },
    },
    orderBy: (p) => [p.createdAt],
  })
}

export async function updateProject(
  tenantId: string,
  projectId: string,
  data: Partial<{
    name: string
    address: string
    status: string
  }>
) {
  const [updated] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.tenantId, tenantId)
      )
    )
    .returning()

  return updated
}

export async function deleteProject(
  tenantId: string,
  projectId: string
) {
  await db
    .delete(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.tenantId, tenantId)
      )
    )
}
