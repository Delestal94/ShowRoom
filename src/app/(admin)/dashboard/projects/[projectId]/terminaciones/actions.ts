'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { createFinish, deleteFinish } from '@/modules/finishes/finish-service'

export interface FinishState {
  error?: string
  notice?: string
}

export async function createFinishAction(
  projectId: string,
  _prev: FinishState,
  formData: FormData
): Promise<FinishState> {
  const category = String(formData.get('category') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const imageUrl = String(formData.get('imageUrl') ?? '').trim()
  const storageKey = String(formData.get('storageKey') ?? '').trim()

  if (!category) return { error: 'Elegí una categoría.' }
  if (!name) return { error: 'Ponele un nombre a la opción.' }

  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) return { error: 'No tenés acceso a este proyecto.' }

  try {
    await createFinish(tenant.tenantId, projectId, {
      category,
      name,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      storageKey: storageKey || undefined,
    })
  } catch (error) {
    console.error('Error creating finish option:', error)
    return { error: 'No se pudo guardar la terminación.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/terminaciones`)
  revalidatePath(`/${project.slug}`)
  return { notice: `${name} agregada a ${category}.` }
}

export async function deleteFinishAction(
  projectId: string,
  finishId: string
): Promise<FinishState> {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) return { error: 'No tenés acceso a este proyecto.' }

  await deleteFinish(tenant.tenantId, finishId)
  revalidatePath(`/dashboard/projects/${projectId}/terminaciones`)
  revalidatePath(`/${project.slug}`)
  return {}
}
