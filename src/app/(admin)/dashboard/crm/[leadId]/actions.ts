'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { updateLead, addLeadNote } from '@/modules/leads/lead-service'

export interface LeadState {
  error?: string
}

const VALID = ['new', 'contacted', 'qualified', 'won', 'lost'] as const

export async function setLeadStatusAction(
  leadId: string,
  status: string
): Promise<LeadState> {
  if (!VALID.includes(status as (typeof VALID)[number])) {
    return { error: 'Estado inválido.' }
  }

  const tenant = await requireCurrentTenant()
  const updated = await updateLead(tenant.tenantId, leadId, { status: status as any })
  if (!updated) return { error: 'No encontramos ese lead.' }

  revalidatePath(`/dashboard/crm/${leadId}`)
  revalidatePath('/dashboard/crm')
  return {}
}

export async function addNoteAction(
  leadId: string,
  _prev: LeadState,
  formData: FormData
): Promise<LeadState> {
  const note = String(formData.get('note') ?? '').trim()
  if (!note) return { error: 'Escribí algo antes de guardar.' }
  if (note.length > 2000) return { error: 'La nota es demasiado larga.' }

  const tenant = await requireCurrentTenant()
  const activity = await addLeadNote(tenant.tenantId, leadId, note)
  if (!activity) return { error: 'No encontramos ese lead.' }

  revalidatePath(`/dashboard/crm/${leadId}`)
  return {}
}
