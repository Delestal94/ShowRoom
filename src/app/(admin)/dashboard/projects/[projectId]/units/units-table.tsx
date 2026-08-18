'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import {
  UNIT_STATUSES,
  UNIT_STATUS_LABEL,
  CURRENCIES,
} from '@/modules/units/unit-constants'
import { updateUnitAction, deleteUnitAction } from './actions'

export interface UnitRow {
  id: string
  code: string
  floor: number | null
  m2: string | null
  price: string | null
  currency: string | null
  orientation: string | null
  bedrooms: number | null
  status: string
}

const inputCls =
  'h-9 w-full rounded-sm border border-border bg-surface-2 px-2 text-sm text-fg focus:border-primary focus:outline-none'

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'available' && 'bg-success/15 text-success',
        status === 'reserved' && 'bg-warning/15 text-warning',
        status === 'sold' && 'bg-fg-subtle/15 text-fg-subtle'
      )}
    >
      {UNIT_STATUS_LABEL[status] ?? status}
    </span>
  )
}

function formatMoney(price: string | null, currency: string | null) {
  if (!price) return '—'
  const n = Number(price)
  if (!Number.isFinite(n)) return price
  return `${currency ?? 'USD'} ${n.toLocaleString('es-AR')}`
}

function UnitTableRow({ unit, projectId }: { unit: UnitRow; projectId: string }) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [draft, setDraft] = useState({
    code: unit.code,
    floor: unit.floor?.toString() ?? '',
    m2: unit.m2 ?? '',
    price: unit.price ?? '',
    currency: unit.currency ?? 'USD',
    orientation: unit.orientation ?? '',
    bedrooms: unit.bedrooms?.toString() ?? '',
    status: unit.status,
  })

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateUnitAction(projectId, unit.id, draft)
      if (result.error) setError(result.error)
      else setEditing(false)
    })
  }

  const remove = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteUnitAction(projectId, unit.id)
      if (result.error) {
        setError(result.error)
        setConfirmingDelete(false)
      }
    })
  }

  if (editing) {
    return (
      <tr className="border-b border-border bg-surface-2/40">
        <td className="p-2">
          <input
            className={inputCls}
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            aria-label="Código"
          />
        </td>
        <td className="p-2">
          <input
            className={inputCls}
            value={draft.floor}
            onChange={(e) => setDraft({ ...draft, floor: e.target.value })}
            aria-label="Piso"
            inputMode="numeric"
          />
        </td>
        <td className="p-2">
          <input
            className={inputCls}
            value={draft.m2}
            onChange={(e) => setDraft({ ...draft, m2: e.target.value })}
            aria-label="m²"
            inputMode="decimal"
          />
        </td>
        <td className="p-2">
          <div className="flex gap-1">
            <select
              className={cn(inputCls, 'w-20')}
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              aria-label="Moneda"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className={inputCls}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              aria-label="Precio"
              inputMode="decimal"
            />
          </div>
        </td>
        <td className="p-2">
          <input
            className={inputCls}
            value={draft.orientation}
            onChange={(e) => setDraft({ ...draft, orientation: e.target.value })}
            aria-label="Orientación"
          />
        </td>
        <td className="p-2">
          <input
            className={inputCls}
            value={draft.bedrooms}
            onChange={(e) => setDraft({ ...draft, bedrooms: e.target.value })}
            aria-label="Dormitorios"
            inputMode="numeric"
          />
        </td>
        <td className="p-2">
          <select
            className={inputCls}
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            aria-label="Estado"
          >
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {UNIT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </td>
        <td className="p-2">
          <div className="flex justify-end gap-1">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? '…' : 'Guardar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
          {error && <p className="mt-1 text-right text-xs text-danger">{error}</p>}
        </td>
      </tr>
    )
  }

  return (
    <tr className={cn('border-b border-border transition-opacity', pending && 'opacity-50')}>
      <td className="p-3 font-medium text-fg">{unit.code}</td>
      <td className="p-3 text-fg-muted">{unit.floor ?? '—'}</td>
      <td className="p-3 text-fg-muted">{unit.m2 ? `${unit.m2} m²` : '—'}</td>
      <td className="p-3 font-mono text-sm text-fg-muted">
        {formatMoney(unit.price, unit.currency)}
      </td>
      <td className="p-3 text-fg-muted">{unit.orientation || '—'}</td>
      <td className="p-3 text-fg-muted">{unit.bedrooms ?? '—'}</td>
      <td className="p-3">
        <StatusBadge status={unit.status} />
      </td>
      <td className="p-3">
        <div className="flex justify-end gap-1">
          {confirmingDelete ? (
            <>
              <Button size="sm" variant="danger" onClick={remove} disabled={pending}>
                {pending ? '…' : 'Confirmar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
              >
                No
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                Borrar
              </Button>
            </>
          )}
        </div>
        {error && <p className="mt-1 text-right text-xs text-danger">{error}</p>}
      </td>
    </tr>
  )
}

export function UnitsTable({ units, projectId }: { units: UnitRow[]; projectId: string }) {
  if (units.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
        <h3 className="font-semibold text-fg">Todavía no hay unidades</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
          Cargá las unidades una por una, o pegá varias de una vez desde una planilla.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-subtle">
            <th className="p-3 font-medium">Código</th>
            <th className="p-3 font-medium">Piso</th>
            <th className="p-3 font-medium">Superficie</th>
            <th className="p-3 font-medium">Precio</th>
            <th className="p-3 font-medium">Orientación</th>
            <th className="p-3 font-medium">Dorm.</th>
            <th className="p-3 font-medium">Estado</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <UnitTableRow key={unit.id} unit={unit} projectId={projectId} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
