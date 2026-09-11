'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { canManageContent } from '@/modules/tenancy/permissions'
import { getProject } from '@/modules/projects/project-service'
import { createBuilding, deleteBuilding } from '@/modules/buildings/building-service'

export interface BuildingState { error?: string; notice?: string }

async function projectContext(projectId: string) {
  const tenant = await requireCurrentTenant()
  if (!canManageContent(tenant.role)) throw new Error('FORBIDDEN')
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) throw new Error('NOT_FOUND')
  return { tenant, project }
}

export async function createBuildingAction(
  projectId: string,
  _previous: BuildingState,
  formData: FormData
): Promise<BuildingState> {
  const name = String(formData.get('name') ?? '').trim()
  const floorsRaw = String(formData.get('floorsCount') ?? '').trim()
  if (!name) return { error: 'La torre necesita un nombre.' }
  if (name.length > 100) return { error: 'El nombre es demasiado largo.' }

  const floorsCount = floorsRaw ? Number.parseInt(floorsRaw, 10) : undefined
  if (floorsRaw && (!Number.isFinite(floorsCount) || floorsCount! < 1 || floorsCount! > 300)) {
    return { error: 'Indicá una cantidad de pisos entre 1 y 300.' }
  }

  try {
    const { tenant } = await projectContext(projectId)
    await createBuilding(tenant.tenantId, projectId, { name, floorsCount })
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Ya existe una torre con ese nombre.' }
    return { error: 'No se pudo crear la torre.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/torres`)
  revalidatePath(`/dashboard/projects/${projectId}/units`)
  return { notice: `Torre ${name} creada.` }
}

export async function deleteBuildingAction(projectId: string, buildingId: string): Promise<BuildingState> {
  try {
    const { tenant } = await projectContext(projectId)
    await deleteBuilding(tenant.tenantId, buildingId)
  } catch {
    return { error: 'No se pudo borrar la torre.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/torres`)
  revalidatePath(`/dashboard/projects/${projectId}/units`)
  return {}
}
