'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getTour, deleteTour } from '@/modules/tours/tour-service'
import { getProject } from '@/modules/projects/project-service'
import { invalidateProject } from '@/modules/public/cached-storefront'

export async function deleteTourAction(
  projectId: string,
  unitId: string,
  tourId: string
): Promise<{ error?: string }> {
  const tenant = await requireCurrentTenant()

  // getTour is tenant-scoped, so a tour id from another tenant resolves to
  // nothing and never reaches the delete.
  const tour = await getTour(tenant.tenantId, tourId)
  if (!tour) return { error: 'No encontramos ese contenido.' }

  try {
    await deleteTour(tenant.tenantId, tourId)
  } catch (error) {
    console.error('Error deleting tour:', error)
    return { error: 'No se pudo borrar.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/units/${unitId}`)
  revalidatePath(`/dashboard/projects/${projectId}`)

  const project = await getProject(tenant.tenantId, projectId)
  if (project) invalidateProject(project.slug)

  return {}
}
