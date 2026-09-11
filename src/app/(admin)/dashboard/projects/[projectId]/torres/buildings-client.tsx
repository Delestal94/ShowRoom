'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createBuildingAction, deleteBuildingAction, type BuildingState } from './actions'

interface Building { id: string; name: string; floorsCount: number | null; unitCount: number }

function Submit() {
  const { pending } = useFormStatus()
  return <Button type="submit" disabled={pending}>{pending ? 'Creando…' : 'Crear torre'}</Button>
}

export function BuildingsClient({ projectId, buildings }: { projectId: string; buildings: Building[] }) {
  const [state, formAction] = useFormState<BuildingState, FormData>(createBuildingAction.bind(null, projectId), {})
  const [pending, startTransition] = useTransition()

  return <div className="space-y-6">
    <form action={formAction} className="grid gap-4 rounded-2xl border border-border bg-surface/50 p-6 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      <label className="block text-sm font-medium text-fg">Nombre
        <input name="name" required placeholder="Torre A" className="mt-1 h-11 w-full rounded-md border border-border bg-surface-2/60 px-3 text-sm text-fg" />
      </label>
      <label className="block text-sm font-medium text-fg">Pisos
        <input name="floorsCount" inputMode="numeric" placeholder="12" className="mt-1 h-11 w-full rounded-md border border-border bg-surface-2/60 px-3 text-sm text-fg" />
      </label>
      <Submit />
      {state.error && <p className="sm:col-span-3 text-sm text-danger">{state.error}</p>}
      {state.notice && <p className="sm:col-span-3 text-sm text-success">{state.notice}</p>}
    </form>

    <div className="overflow-hidden rounded-2xl border border-border bg-surface/50">
      {buildings.length === 0 ? <p className="p-6 text-sm text-fg-muted">Este proyecto todavía no tiene torres. Las unidades pueden quedar sin asignar.</p> : (
        <ul>{buildings.map((building) => <li key={building.id} className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-0">
          <div><p className="font-medium text-fg">{building.name}</p><p className="text-sm text-fg-muted">{building.floorsCount ? `${building.floorsCount} pisos · ` : ''}{building.unitCount} unidades</p></div>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await deleteBuildingAction(projectId, building.id) })}>Borrar</Button>
        </li>)}</ul>
      )}</div>
  </div>
}
