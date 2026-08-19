export interface Amenity {
  name: string
  description?: string
  imageUrl?: string
}

export interface FinancingPlan {
  name: string
  downPayment?: string
  installments?: string
  adjustment?: string
  notes?: string
}

export interface PortfolioItem {
  name: string
  year?: string
  units?: string
  description?: string
  imageUrl?: string
}

export function AmenitiesSection({ amenities }: { amenities: Amenity[] }) {
  if (amenities.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {amenities.map((amenity) => (
        <article
          key={amenity.name}
          className="overflow-hidden rounded-2xl border border-border bg-surface/50"
        >
          {amenity.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={amenity.imageUrl}
              alt={amenity.name}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          )}
          <div className="p-5">
            <h3 className="font-semibold text-fg">{amenity.name}</h3>
            {amenity.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {amenity.description}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

/**
 * Las condiciones de financiación son la pregunta que más se repite en una
 * preventa. Mostrarlas evita que cada consulta empiece por ahí.
 */
export function FinancingSection({ plans }: { plans: FinancingPlan[] }) {
  if (plans.length === 0) return null

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className="rounded-2xl border border-border bg-surface/50 p-6"
          >
            <h3 className="font-semibold text-fg">{plan.name}</h3>

            <dl className="mt-4 space-y-3 text-sm">
              {plan.downPayment && (
                <div className="flex justify-between gap-3 border-t border-border pt-3">
                  <dt className="text-fg-subtle">Anticipo</dt>
                  <dd className="text-right font-medium text-fg">{plan.downPayment}</dd>
                </div>
              )}
              {plan.installments && (
                <div className="flex justify-between gap-3 border-t border-border pt-3">
                  <dt className="text-fg-subtle">Cuotas</dt>
                  <dd className="text-right font-medium text-fg">{plan.installments}</dd>
                </div>
              )}
              {plan.adjustment && (
                <div className="flex justify-between gap-3 border-t border-border pt-3">
                  <dt className="text-fg-subtle">Ajuste</dt>
                  <dd className="text-right font-medium text-fg">{plan.adjustment}</dd>
                </div>
              )}
            </dl>

            {plan.notes && (
              <p className="mt-4 text-xs leading-relaxed text-fg-muted">{plan.notes}</p>
            )}
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-fg-subtle">
        Las condiciones son orientativas y pueden variar según la unidad y el momento de la
        operación. Consultanos para el detalle.
      </p>
    </div>
  )
}

export function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.name}
          className="overflow-hidden rounded-2xl border border-border bg-surface/50"
        >
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          )}
          <div className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold text-fg">{item.name}</h3>
              {item.year && (
                <span className="shrink-0 font-mono text-xs text-fg-subtle">{item.year}</span>
              )}
            </div>
            {item.units && <p className="mt-1 text-xs text-primary">{item.units}</p>}
            {item.description && (
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.description}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
