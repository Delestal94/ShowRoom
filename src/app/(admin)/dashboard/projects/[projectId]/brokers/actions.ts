'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { createBrokerLink, deleteBrokerLink } from '@/modules/brokers/broker-service'

export interface BrokerState {
  error?: string
  notice?: string
}

export async function createBrokerLinkAction(
  projectId: string,
  _prev: BrokerState,
  formData: FormData
): Promise<BrokerState> {
  const brokerName = String(formData.get('brokerName') ?? '').trim()
  if (!brokerName) return { error: 'Poné el nombre del broker o inmobiliaria.' }
  if (brokerName.length > 120) return { error: 'El nombre es demasiado largo.' }

  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) return { error: 'No tenés acceso a este proyecto.' }

  try {
    await createBrokerLink(tenant.tenantId, projectId, brokerName)
  } catch (error) {
    console.error('Error creating broker link:', error)
    return { error: 'No se pudo crear el link.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/brokers`)
  return { notice: `Link creado para ${brokerName}.` }
}

export async function deleteBrokerLinkAction(
  projectId: string,
  linkId: string
): Promise<BrokerState> {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) return { error: 'No tenés acceso a este proyecto.' }

  // Los leads ya atribuidos quedan con broker_link_id en null (ON DELETE SET
  // NULL): se pierde la atribución pero no el lead.
  await deleteBrokerLink(tenant.tenantId, linkId)

  revalidatePath(`/dashboard/projects/${projectId}/brokers`)
  return {}
}
