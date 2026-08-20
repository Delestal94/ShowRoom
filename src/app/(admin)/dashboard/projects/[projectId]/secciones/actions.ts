'use server'

import { revalidatePath } from 'next/cache'
import { invalidateProject } from '@/modules/public/cached-storefront'
import { eq, and } from 'drizzle-orm'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { withTenant } from '@/server/db/tenant-db'
import { projects } from '@/server/db/schema'

export interface SectionsState {
  error?: string
  notice?: string
}

/**
 * Las listas llegan como JSON desde el editor del cliente. Se parsea con
 * tolerancia: un JSON roto no debe tirar abajo el guardado del resto.
 */
function parseList(raw: string, allowedKeys: string[]) {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .slice(0, 40)
      .map((item) => {
        const clean: Record<string, string> = {}
        for (const key of allowedKeys) {
          const value = item?.[key]
          if (typeof value === 'string' && value.trim()) {
            clean[key] = value.trim().slice(0, 600)
          }
        }
        return clean
      })
      // Una fila vacía (el usuario tocó "agregar" y no completó nada) no se guarda.
      .filter((item) => Object.keys(item).length > 0 && item.name)
  } catch {
    return []
  }
}

export async function updateSectionsAction(
  projectId: string,
  _prev: SectionsState,
  formData: FormData
): Promise<SectionsState> {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) return { error: 'No tenés acceso a este proyecto.' }

  const amenities = parseList(String(formData.get('amenities') ?? '[]'), [
    'name',
    'description',
    'imageUrl',
  ])
  const financing = parseList(String(formData.get('financing') ?? '[]'), [
    'name',
    'downPayment',
    'installments',
    'adjustment',
    'notes',
  ])

  try {
    await withTenant(tenant.tenantId, (tx) =>
      tx
        .update(projects)
        .set({
          amenitiesJson: amenities,
          financingJson: financing,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenant.tenantId)))
    )
  } catch (error) {
    console.error('Error updating project sections:', error)
    return { error: 'No se pudieron guardar las secciones.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/secciones`)
  invalidateProject(project.slug)
  return { notice: 'Secciones guardadas.' }
}
