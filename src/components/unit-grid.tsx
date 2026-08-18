'use client'

import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/cn'
import { UNIT_STATUS_LABEL } from '@/modules/units/unit-constants'

interface Unit {
  id: string
  code: string
  floor?: number
  m2?: string
  price?: string
  currency?: string
  orientation?: string
  bedrooms?: number
  status: string
}

interface UnitGridProps {
  units: Unit[]
  loading?: boolean
  onUnitSelect?: (unit: Unit) => void
  projectSlug?: string
}

function formatPrice(value?: string, currency?: string): string {
  if (!value) return 'Consultar'
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return 'Consultar'
  return `${currency ?? 'USD'} ${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(n)}`
}

function formatM2(value?: string): string {
  if (!value) return '—'
  const n = parseFloat(value)
  return Number.isFinite(n) ? `${Math.round(n)} m²` : '—'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-medium',
        status === 'available' && 'bg-success/15 text-success',
        status === 'reserved' && 'bg-warning/15 text-warning',
        status === 'sold' && 'bg-fg-subtle/15 text-fg-subtle'
      )}
    >
      {UNIT_STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function UnitGrid({ units, loading, onUnitSelect, projectSlug }: UnitGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl border border-border bg-surface/40"
          />
        ))}
      </div>
    )
  }

  if (units.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
        <h3 className="font-semibold text-fg">No hay unidades que coincidan</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
          Probá ampliando el rango de precio o superficie, o limpiá los filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {units.map((unit) => {
        const sold = unit.status === 'sold'

        return (
          <button
            key={unit.id}
            type="button"
            disabled={sold}
            onClick={() => {
              if (sold) return
              onUnitSelect?.(unit)
              if (projectSlug) {
                trackEvent({
                  type: 'unit_view',
                  projectSlug,
                  metadata: { unit_id: unit.id, unit_code: unit.code },
                })
              }
            }}
            className={cn(
              'group rounded-2xl border border-border bg-surface/50 p-5 text-left transition-colors',
              sold
                ? 'cursor-not-allowed opacity-60'
                : 'hover:border-primary/50 hover:bg-surface'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-fg">{unit.code}</h3>
                {unit.floor != null && (
                  <p className="mt-0.5 text-xs text-fg-subtle">Piso {unit.floor}</p>
                )}
              </div>
              <StatusBadge status={unit.status} />
            </div>

            <p className="mt-4 font-mono text-xl font-semibold tracking-tight text-fg">
              {formatPrice(unit.price, unit.currency)}
            </p>

            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-sm">
              <div>
                <dt className="text-xs text-fg-subtle">Superficie</dt>
                <dd className="mt-0.5 font-medium text-fg">{formatM2(unit.m2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Dorm.</dt>
                <dd className="mt-0.5 font-medium text-fg">{unit.bedrooms ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Orientación</dt>
                <dd className="mt-0.5 truncate font-medium text-fg">
                  {unit.orientation || '—'}
                </dd>
              </div>
            </dl>
          </button>
        )
      })}
    </div>
  )
}
