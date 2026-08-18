'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getUser } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import {
  createPreapproval,
  cancelPreapproval,
  isConfigured,
} from '@/modules/billing/mercadopago-client'
import {
  getPlanBySlug,
  getTenantSubscription,
  upsertSubscription,
} from '@/modules/billing/billing-service'
import { withTenant } from '@/server/db/tenant-db'
import { subscriptions } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export interface BillingState {
  error?: string
  notice?: string
}

export async function subscribeAction(
  planSlug: string,
  _prev: BillingState,
  _formData: FormData
): Promise<BillingState> {
  if (!isConfigured()) {
    return {
      error:
        'Falta configurar MP_ACCESS_TOKEN. Cargá las credenciales de Mercado Pago para habilitar el cobro.',
    }
  }

  const [tenant, user] = await Promise.all([requireCurrentTenant(), getUser()])
  const plan = await getPlanBySlug(planSlug)

  if (!plan) return { error: 'Ese plan no existe.' }
  if (!plan.mpPreapprovalPlanId) {
    return {
      error: `El plan ${plan.name} todavía no está publicado en Mercado Pago. Corré "npm run seed:plans".`,
    }
  }

  let initPoint: string
  try {
    const preapproval = await createPreapproval({
      preapprovalPlanId: plan.mpPreapprovalPlanId,
      payerEmail: user?.email ?? '',
      // Carries the tenant so the webhook can attribute the subscription
      // without needing a session.
      externalReference: tenant.tenantId,
      backUrl: new URL('/dashboard/billing', getSiteUrl()).toString(),
    })

    // Recorded as pending: it only becomes active once the payer authorizes
    // it and Mercado Pago notifies us.
    await upsertSubscription({
      tenantId: tenant.tenantId,
      planId: plan.id,
      mpPreapprovalId: preapproval.id,
      status: preapproval.status ?? 'pending',
    })

    if (!preapproval.init_point) {
      return { error: 'Mercado Pago no devolvió un link de pago. Intentá de nuevo.' }
    }
    initPoint = preapproval.init_point
  } catch (error) {
    console.error('Error creando suscripción en Mercado Pago:', error)
    return { error: 'No se pudo iniciar la suscripción. Intentá de nuevo.' }
  }

  revalidatePath('/dashboard/billing')
  redirect(initPoint)
}

export async function cancelSubscriptionAction(): Promise<BillingState> {
  const tenant = await requireCurrentTenant()
  const current = await getTenantSubscription(tenant.tenantId)

  if (!current.isActive) {
    return { error: 'No tenés una suscripción activa.' }
  }

  const row = await withTenant(tenant.tenantId, (tx) =>
    tx.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenant.tenantId),
    })
  )

  if (!row?.mpPreapprovalId) {
    return { error: 'No encontramos la suscripción en Mercado Pago.' }
  }

  try {
    await cancelPreapproval(row.mpPreapprovalId)
    await upsertSubscription({
      tenantId: tenant.tenantId,
      planId: row.planId,
      mpPreapprovalId: row.mpPreapprovalId,
      status: 'cancelled',
    })
  } catch (error) {
    console.error('Error cancelando suscripción:', error)
    return { error: 'No se pudo cancelar. Probá de nuevo en unos minutos.' }
  }

  revalidatePath('/dashboard/billing')
  return { notice: 'Suscripción cancelada.' }
}
