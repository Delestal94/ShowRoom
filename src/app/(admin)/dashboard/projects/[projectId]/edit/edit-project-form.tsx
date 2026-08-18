'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import type { CreateProjectState } from '../../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  )
}

export function EditProjectForm({
  action,
  defaults,
}: {
  action: (prev: CreateProjectState, formData: FormData) => Promise<CreateProjectState>
  defaults: {
    name: string
    slug: string
    address: string
    coords: string
    pointsOfInterest: string
  }
}) {
  const [state, formAction] = useFormState(action, {})
  const [slug, setSlug] = useState(defaults.slug)

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state.error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Field label="Nombre del proyecto" name="name" defaultValue={defaults.name} required />

      <Field
        label="Slug (URL pública)"
        name="slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        hint={<span className="text-xs text-fg-subtle">showroom.app/{slug || '…'}</span>}
      />

      <Field label="Dirección" name="address" defaultValue={defaults.address} />

      <Field
        label="Coordenadas"
        name="coords"
        defaultValue={defaults.coords}
        placeholder="-34.6037, -58.3816"
        hint={<span className="text-xs text-fg-subtle">Opcional</span>}
      />
      <p className="-mt-3 text-xs text-fg-subtle">
        Buscá la dirección en Google Maps, hacé clic derecho sobre el punto y copiá las
        coordenadas. Sin esto, la página pública no muestra el mapa.
      </p>

      <div>
        <label htmlFor="poi" className="mb-1.5 block text-sm font-medium text-fg">
          Puntos de interés cercanos{' '}
          <span className="font-normal text-fg-subtle">(opcional)</span>
        </label>
        <textarea
          id="poi"
          name="pointsOfInterest"
          rows={5}
          defaultValue={defaults.pointsOfInterest}
          placeholder={'Subte línea B — 300 m\nParque Centenario — 600 m\nHospital Italiano — 1,2 km'}
          className="w-full rounded-md border border-border bg-surface-2/60 p-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <p className="mt-2 text-xs text-fg-subtle">
          Uno por línea. Separá el nombre de la distancia con un guión.
        </p>
      </div>

      <SubmitButton />
    </form>
  )
}
