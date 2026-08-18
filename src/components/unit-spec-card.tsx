import { cn } from '@/lib/cn'
import { UNIT_STATUS_LABEL } from '@/modules/units/unit-constants'

interface UnitSpecCardProps {
  code: string
  floor: number | null
  m2: string | null
  price: string | null
  currency: string | null
  bedrooms: number | null
  orientation: string | null
  status: string
  /** Free-form extras stored on the unit (cochera, baulera, balcón…). */
  attrs?: Record<string, unknown> | null
}

function formatPrice(price: string | null, currency: string | null) {
  if (!price) return 'Consultar'
  const n = Number(price)
  if (!Number.isFinite(n)) return 'Consultar'
  return `${currency ?? 'USD'} ${n.toLocaleString('es-AR')}`
}

/** Price per m² is the number buyers actually compare between units. */
function pricePerM2(price: string | null, m2: string | null, currency: string | null) {
  const p = Number(price)
  const s = Number(m2)
  if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0) return null
  return `${currency ?? 'USD'} ${Math.round(p / s).toLocaleString('es-AR')} / m²`
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-t border-border py-3">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium text-fg">{value}</dd>
    </div>
  )
}

export function UnitSpecCard({
  code,
  floor,
  m2,
  price,
  currency,
  bedrooms,
  orientation,
  status,
  attrs,
}: UnitSpecCardProps) {
  const perM2 = pricePerM2(price, m2, currency)

  const extras = attrs
    ? Object.entries(attrs).filter(([, v]) => v !== null && v !== '' && v !== false)
    : []

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-subtle">Unidad</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg">{code}</h1>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
            status === 'available' && 'bg-success/15 text-success',
            status === 'reserved' && 'bg-warning/15 text-warning',
            status === 'sold' && 'bg-fg-subtle/15 text-fg-subtle'
          )}
        >
          {UNIT_STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <p className="mt-5 font-mono text-2xl font-semibold tracking-tight text-fg">
        {formatPrice(price, currency)}
      </p>
      {perM2 && <p className="mt-1 text-sm text-fg-muted">{perM2}</p>}

      <dl className="mt-5">
        <Spec label="Superficie" value={m2 ? `${Math.round(Number(m2))} m²` : '—'} />
        <Spec label="Dormitorios" value={bedrooms ?? '—'} />
        <Spec label="Orientación" value={orientation || '—'} />
        <Spec label="Piso" value={floor ?? '—'} />
        {extras.map(([key, value]) => (
          <Spec
            key={key}
            label={key}
            value={typeof value === 'boolean' ? 'Sí' : String(value)}
          />
        ))}
      </dl>
    </div>
  )
}
