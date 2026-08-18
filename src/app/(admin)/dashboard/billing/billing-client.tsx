'use client'

import { useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { subscribeAction, cancelSubscriptionAction, type BillingState } from './actions'

export function UsageBar({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const atLimit = used >= limit

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-fg">{label}</span>
        <span className={atLimit ? 'font-medium text-warning' : 'text-fg-muted'}>
          {used} / {limit}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full transition-all', atLimit ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SubscribeButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="mt-6 w-full">
      {pending ? 'Redirigiendo…' : label}
    </Button>
  )
}

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: {
    slug: string
    name: string
    priceMonthly: string
    currency: string
    unitLimit: number
    projectLimit: number
    features: string[]
    available: boolean
  }
  isCurrent: boolean
}) {
  const [state, formAction] = useFormState<BillingState, FormData>(
    subscribeAction.bind(null, plan.slug),
    {}
  )

  const price = Number(plan.priceMonthly)

  return (
    <div
      className={cn(
        'rounded-2xl border p-6',
        isCurrent ? 'border-primary/50 bg-surface' : 'border-border bg-surface/40'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-fg">{plan.name}</h3>
        {isCurrent && (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
            Actual
          </span>
        )}
      </div>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-sm text-fg-muted">{plan.currency}</span>
        <span className="text-3xl font-semibold tracking-tight text-fg">
          {Number.isFinite(price) ? price.toLocaleString('es-AR') : plan.priceMonthly}
        </span>
        <span className="text-sm text-fg-muted">/mes</span>
      </p>

      <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm text-fg-muted">
        <li>{plan.projectLimit} proyecto(s)</li>
        <li>Hasta {plan.unitLimit} unidades</li>
        {plan.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}

      {isCurrent ? (
        <Button variant="outline" disabled className="mt-6 w-full">
          Tu plan actual
        </Button>
      ) : (
        <form action={formAction}>
          <SubscribeButton label={plan.available ? 'Suscribirme' : 'No disponible'} />
        </form>
      )}
    </div>
  )
}

export function PlanCards({
  plans,
  currentSlug,
}: {
  plans: Parameters<typeof PlanCard>[0]['plan'][]
  currentSlug: string
}) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.slug} plan={plan} isCurrent={plan.slug === currentSlug} />
      ))}
    </div>
  )
}

export function CancelButton() {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const cancel = () => {
    setError(null)
    startTransition(async () => {
      const result = await cancelSubscriptionAction()
      if (result.error) setError(result.error)
      setConfirming(false)
    })
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Cancelar suscripción
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="text-sm text-fg-muted">Se cancela el cobro del próximo período.</p>
      <div className="flex gap-2">
        <Button variant="danger" size="sm" onClick={cancel} disabled={pending}>
          {pending ? 'Cancelando…' : 'Sí, cancelar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Volver
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
