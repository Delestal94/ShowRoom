'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Field } from '@/components/ui/field'
import { ListEditor } from '@/components/ui/list-editor'
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
  defaults: {
    name: string
    whatsapp: string
    customDomain: string
    portfolio: Record<string, string>[]
  }
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

      <Field
        label="Dominio propio"
        name="customDomain"
        defaultValue={defaults.customDomain}
        placeholder="showroom.tuinmobiliaria.com"
        hint={<span className="text-xs text-fg-subtle">Opcional</span>}
      />
      <p className="-mt-3 text-xs text-fg-subtle">
        Guardarlo acá es el primer paso. Después hay que agregarlo en Vercel y apuntar el DNS —
        ver docs/SETUP_DOMINIO.md. Mientras tanto tus proyectos siguen funcionando en la
        dirección actual.
      </p>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium text-fg">Obras entregadas</p>
        <p className="mt-1 text-xs text-fg-subtle">
          Se muestran al pie de cada proyecto publicado. Es lo que le da respaldo a una
          preventa: el comprador ve que ya entregaste antes.
        </p>
        <div className="mt-4">
          <ListEditor
            name="portfolio"
            addLabel="Agregar obra"
            initial={defaults.portfolio}
            fields={[
              { key: 'name', label: 'Nombre', placeholder: 'Edificio Rivadavia' },
              { key: 'year', label: 'Año de entrega', placeholder: '2023' },
              { key: 'units', label: 'Unidades', placeholder: '48 unidades' },
              { key: 'description', label: 'Descripción', placeholder: 'Entregado en tiempo y forma.', long: true },
            ]}
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  )
}
