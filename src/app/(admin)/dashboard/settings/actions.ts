'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { withTenant } from '@/server/db/tenant-db'
import { tenants } from '@/server/db/schema'

export interface SettingsState {
  error?: string
  notice?: string
}

export async function updateTenantAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const name = String(formData.get('name') ?? '').trim()
  const rawWhatsapp = String(formData.get('whatsapp') ?? '').trim()
  const rawDomain = String(formData.get('customDomain') ?? '').trim()

  if (!name) return { error: 'El nombre no puede quedar vacío.' }

  // wa.me needs digits only, no +, spaces or dashes.
  const whatsapp = rawWhatsapp.replace(/\D/g, '')

  if (rawWhatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) {
    return {
      error:
        'Revisá el número: tiene que incluir código de país y área, sin el +. Ej: 5491122334455',
    }
  }

  // Se acepta el dominio pelado: sin protocolo, sin barra, en minúsculas.
  const customDomain = rawDomain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim()

  if (customDomain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(customDomain)) {
    return { error: 'Revisá el dominio. Ej: showroom.tuinmobiliaria.com' }
  }

  const tenant = await requireCurrentTenant()

  try {
    await withTenant(tenant.tenantId, (tx) =>
      tx
        .update(tenants)
        .set({
          name,
          contactWhatsapp: whatsapp || null,
          customDomain: customDomain || null,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenant.tenantId))
    )
  } catch (error) {
    console.error('Error updating tenant:', error)
    return { error: 'No se pudieron guardar los cambios.' }
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { notice: 'Cambios guardados.' }
}
