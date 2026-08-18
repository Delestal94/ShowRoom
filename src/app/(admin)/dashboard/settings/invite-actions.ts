'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import {
  createInvitation,
  revokeInvitation,
} from '@/modules/tenancy/invitation-service'
import { INVITE_ROLES, type InviteRole } from '@/modules/tenancy/invitation-constants'

export interface InviteState {
  error?: string
  notice?: string
}

export async function createInviteAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const role = String(formData.get('role') ?? 'editor')
  const label = String(formData.get('label') ?? '').trim()

  if (!INVITE_ROLES.includes(role as InviteRole)) {
    return { error: 'Rol inválido.' }
  }

  const tenant = await requireCurrentTenant()

  // Sólo un administrador puede sumar gente al tenant.
  if (tenant.role !== 'tenant_admin') {
    return { error: 'Sólo un administrador puede invitar.' }
  }

  try {
    await createInvitation(tenant.tenantId, role as InviteRole, label || undefined)
  } catch (error) {
    console.error('Error creating invitation:', error)
    return { error: 'No se pudo crear la invitación.' }
  }

  revalidatePath('/dashboard/settings')
  return { notice: 'Invitación creada. Copiá el link y mandáselo.' }
}

export async function revokeInviteAction(invitationId: string): Promise<InviteState> {
  const tenant = await requireCurrentTenant()
  if (tenant.role !== 'tenant_admin') {
    return { error: 'Sólo un administrador puede revocar invitaciones.' }
  }

  await revokeInvitation(tenant.tenantId, invitationId)
  revalidatePath('/dashboard/settings')
  return {}
}
