'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import type { CreateProjectState } from '../actions'

function slugPreview(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? 'Creando…' : 'Crear proyecto'}
    </Button>
  )
}

export function NewProjectForm({
  action,
}: {
  action: (prev: CreateProjectState, formData: FormData) => Promise<CreateProjectState>
}) {
  const [state, formAction] = useFormState(action, {})
  const [name, setName] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slug, setSlug] = useState('')

  const displaySlug = slugTouched ? slug : slugPreview(name)

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state.error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Field
        label="Nombre del proyecto"
        name="name"
        placeholder="Torre Almagro"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <Field
        label="Slug (URL pública)"
        name="slug"
        placeholder="torre-almagro"
        value={displaySlug}
        onChange={(e) => {
          setSlugTouched(true)
          setSlug(e.target.value)
        }}
        hint={
          <span className="text-xs text-fg-subtle">showroom.app/{displaySlug || '…'}</span>
        }
      />

      <Field label="Dirección" name="address" placeholder="Av. Corrientes 1234, CABA" />

      <SubmitButton />
    </form>
  )
}
