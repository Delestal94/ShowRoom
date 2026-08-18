import type { Metadata } from 'next'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { listPlans, getTenantSubscription, getUsage } from '@/modules/billing/billing-service'
import { isConfigured } from '@/modules/billing/mercadopago-client'
import { PlanCards, UsageBar, CancelButton } from './billing-client'

export const metadata: Metadata = { title: 'Plan y facturación' }

export default async function BillingPage() {
  const tenant = await requireCurrentTenant()
  const [plans, subscription, usage] = await Promise.all([
    listPlans(),
    getTenantSubscription(tenant.tenantId),
    getUsage(tenant.tenantId),
  ])

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-title font-semibold text-fg">Plan y facturación</h1>
      <p className="mt-1 text-fg-muted">
        Cobro mensual con Mercado Pago. Podés cancelar cuando quieras.
      </p>

      {!isConfigured() && (
        <p className="mt-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Mercado Pago todavía no está configurado (falta <code>MP_ACCESS_TOKEN</code>). Podés ver
          los planes, pero no suscribirte.
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-surface/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-fg-muted">Plan actual</p>
            <p className="mt-1 text-2xl font-semibold text-fg">{subscription.planName}</p>
            {subscription.currentPeriodEnd && subscription.isActive && (
              <p className="mt-1 text-sm text-fg-subtle">
                Próximo cobro:{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-AR')}
              </p>
            )}
            {subscription.status === 'pending' && (
              <p className="mt-1 text-sm text-warning">
                Suscripción pendiente de autorización en Mercado Pago.
              </p>
            )}
          </div>
          {subscription.isActive && <CancelButton />}
        </div>

        <div className="mt-6 space-y-4 border-t border-border pt-6">
          <UsageBar
            label="Proyectos"
            used={usage.projects.used}
            limit={usage.projects.limit}
          />
          <UsageBar label="Unidades" used={usage.units.used} limit={usage.units.limit} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-title font-semibold text-fg">Planes disponibles</h2>
        {plans.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
            Todavía no hay planes cargados. Corré <code>npm run seed:plans</code> para crearlos.
          </p>
        ) : (
          <PlanCards
            plans={plans.map((p) => ({
              slug: p.slug,
              name: p.name,
              priceMonthly: p.priceMonthly,
              currency: p.currency,
              unitLimit: p.unitLimit,
              projectLimit: p.projectLimit,
              features: Array.isArray(p.featuresJson) ? (p.featuresJson as string[]) : [],
              available: Boolean(p.mpPreapprovalPlanId) && isConfigured(),
            }))}
            currentSlug={subscription.planSlug}
          />
        )}
      </section>
    </div>
  )
}
