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
  defaults: { name: string; slug: string; address: string }
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

      <SubmitButton />
    </form>
  )
}
