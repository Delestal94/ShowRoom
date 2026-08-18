'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import {
  UNIT_STATUSES,
  UNIT_STATUS_LABEL,
  ORIENTATIONS,
  CURRENCIES,
} from '@/modules/units/unit-constants'
import { createUnitAction, importUnitsAction, type UnitActionState } from './actions'

const fieldCls =
  'h-11 w-full rounded-md border border-border bg-surface-2/60 px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'

const labelCls = 'mb-1.5 block text-sm font-medium text-fg'

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

function Feedback({ state }: { state: UnitActionState }) {
  if (state.error) {
    return (
      <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
        {state.error}
      </p>
    )
  }
  if (state.notice) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
        {state.notice}
      </p>
    )
  }
  return null
}

function SingleUnitForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useFormState(createUnitAction.bind(null, projectId), {})

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="code" className={labelCls}>
            Código *
          </label>
          <input id="code" name="code" required placeholder="8B" className={fieldCls} />
        </div>

        <div>
          <label htmlFor="floor" className={labelCls}>
            Piso
          </label>
          <input id="floor" name="floor" inputMode="numeric" placeholder="8" className={fieldCls} />
        </div>

        <div>
          <label htmlFor="m2" className={labelCls}>
            Superficie (m²)
          </label>
          <input id="m2" name="m2" inputMode="decimal" placeholder="72,5" className={fieldCls} />
        </div>

        <div>
          <label htmlFor="bedrooms" className={labelCls}>
            Dormitorios
          </label>
          <input
            id="bedrooms"
            name="bedrooms"
            inputMode="numeric"
            placeholder="2"
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="currency" className={labelCls}>
            Moneda
          </label>
          <select id="currency" name="currency" className={fieldCls} defaultValue="USD">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="price" className={labelCls}>
            Precio
          </label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="148000"
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="orientation" className={labelCls}>
            Orientación
          </label>
          <input
            id="orientation"
            name="orientation"
            list="orientations"
            placeholder="Norte"
            className={fieldCls}
          />
          <datalist id="orientations">
            {ORIENTATIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="status" className={labelCls}>
            Estado
          </label>
          <select id="status" name="status" className={fieldCls} defaultValue="available">
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {UNIT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SubmitButton label="Agregar unidad" pendingLabel="Agregando…" />
    </form>
  )
}

function BulkImportForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useFormState(importUnitsAction.bind(null, projectId), {})

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div>
        <label htmlFor="csv" className={labelCls}>
          Pegá las filas (una unidad por línea)
        </label>
        <textarea
          id="csv"
          name="csv"
          rows={9}
          spellCheck={false}
          placeholder={'8B,8,72.5,148000,Norte,2,available\n9A,9,86,179500,Sur,3,available\n9C,9,58,,Este,1,reserved'}
          className="w-full rounded-md border border-border bg-surface-2/60 p-3 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <p className="mt-2 text-xs text-fg-subtle">
          Orden de columnas:{' '}
          <span className="font-mono text-fg-muted">
            código, piso, m², precio, orientación, dormitorios, estado
          </span>
          . Acepta separación por coma, punto y coma o tabulación — así podés copiar y pegar
          directo desde Excel o Google Sheets. Si la primera fila son títulos, se ignora.
        </p>
      </div>

      <SubmitButton label="Importar" pendingLabel="Importando…" />
    </form>
  )
}

export function AddUnitsPanel({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')

  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-6">
      <div className="mb-6 inline-flex gap-1 rounded-full border border-border p-1">
        {(
          [
            ['single', 'Una unidad'],
            ['bulk', 'Importar varias'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors',
              tab === value
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'single' ? (
        <SingleUnitForm projectId={projectId} />
      ) : (
        <BulkImportForm projectId={projectId} />
      )}
    </div>
  )
}
