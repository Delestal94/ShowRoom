'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { updateTenantAction, type SettingsState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  )
}

export function SettingsForm({
  defaults,
}: {
  defaults: { name: string; whatsapp: string }
}) {
  const [state, formAction] = useFormState<SettingsState, FormData>(updateTenantAction, {})

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          {state.notice}
        </p>
      )}

      <Field
        label="Nombre de la inmobiliaria"
        name="name"
        defaultValue={defaults.name}
        required
      />

      <Field
        label="WhatsApp de contacto"
        name="whatsapp"
        defaultValue={defaults.whatsapp}
        placeholder="5491122334455"
        inputMode="numeric"
        hint={<span className="text-xs text-fg-subtle">Opcional</span>}
      />
      <p className="-mt-3 text-xs text-fg-subtle">
        Con código de país y área, sin el + ni espacios. Si lo dejás vacío, el botón de WhatsApp
        no aparece en las páginas públicas.
      </p>

      <SubmitButton />
    </form>
  )
}
