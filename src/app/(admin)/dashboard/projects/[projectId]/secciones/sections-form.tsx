'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { ListEditor } from '@/components/ui/list-editor'
import type { SectionsState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar secciones'}
    </Button>
  )
}

export function SectionsForm({
  action,
  projectId,
  amenities,
  financing,
}: {
  action: (prev: SectionsState, formData: FormData) => Promise<SectionsState>
  projectId: string
  amenities: Record<string, string>[]
  financing: Record<string, string>[]
}) {
  const [state, formAction] = useFormState<SectionsState, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-8">
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

      <section className="rounded-2xl border border-border bg-surface/50 p-6">
        <h2 className="font-semibold text-fg">Amenities</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Pileta, SUM, gimnasio, cochera. Con foto o render si tenés.
        </p>
        <div className="mt-5">
          <ListEditor
            name="amenities"
            addLabel="Agregar amenity"
            uploadProjectId={projectId}
            initial={amenities}
            fields={[
              { key: 'name', label: 'Nombre', placeholder: 'Pileta climatizada' },
              { key: 'description', label: 'Descripción', placeholder: 'En terraza, con solárium', long: true },
              { key: 'imageUrl', label: 'Imagen', image: true },
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface/50 p-6">
        <h2 className="font-semibold text-fg">Financiación</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Es la consulta que más se repite. Publicarla evita responder lo mismo cada vez.
        </p>
        <div className="mt-5">
          <ListEditor
            name="financing"
            addLabel="Agregar plan"
            initial={financing}
            fields={[
              { key: 'name', label: 'Nombre del plan', placeholder: 'Plan 36 cuotas' },
              { key: 'downPayment', label: 'Anticipo', placeholder: '30%' },
              { key: 'installments', label: 'Cuotas', placeholder: '36 mensuales' },
              { key: 'adjustment', label: 'Ajuste', placeholder: 'Índice CAC' },
              { key: 'notes', label: 'Aclaraciones', placeholder: 'Escritura al finalizar la obra.', long: true },
            ]}
          />
        </div>
      </section>

      <SubmitButton />
    </form>
  )
}
