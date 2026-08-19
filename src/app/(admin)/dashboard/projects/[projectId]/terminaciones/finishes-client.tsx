'use client'

import { useRef, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { createFinishAction, deleteFinishAction, type FinishState } from './actions'

const CATEGORIES = ['Pisos', 'Cocina', 'Baños', 'Aberturas', 'Muros', 'Amenities']

const inputCls =
  'h-11 w-full rounded-md border border-border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : 'Agregar opción'}
    </Button>
  )
}

export function NewFinishForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [image, setImage] = useState<{ cdnUrl: string; storageKey: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [state, formAction] = useFormState<FinishState, FormData>(
    async (prev, formData) => {
      formData.set('imageUrl', image?.cdnUrl ?? '')
      formData.set('storageKey', image?.storageKey ?? '')
      const result = await createFinishAction(projectId, prev, formData)
      if (!result.error) {
        formRef.current?.reset()
        setImage(null)
      }
      return result
    },
    {}
  )

  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setUploadError('')

    try {
      const presign = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          tourKind: 'image',
          fileName: `terminacion-${Date.now()}-${file.name}`,
        }),
      })
      if (!presign.ok) {
        const body = await presign.json().catch(() => ({}))
        setUploadError(body.error ?? 'No se pudo preparar la subida')
        return
      }

      const { presignedUrl, storageKey, cdnUrl } = await presign.json()
      const put = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!put.ok) {
        setUploadError('Falló la subida')
        return
      }
      setImage({ cdnUrl, storageKey })
    } finally {
      setUploading(false)
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.notice && <p className="text-sm text-success">{state.notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="fin-cat" className="mb-1.5 block text-sm font-medium text-fg">
            Categoría
          </label>
          <select id="fin-cat" name="category" className={inputCls} defaultValue="Pisos">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fin-name" className="mb-1.5 block text-sm font-medium text-fg">
            Nombre
          </label>
          <input
            id="fin-name"
            name="name"
            required
            placeholder="Porcelanato símil madera"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="fin-desc" className="mb-1.5 block text-sm font-medium text-fg">
          Descripción <span className="font-normal text-fg-subtle">(opcional)</span>
        </label>
        <textarea
          id="fin-desc"
          name="description"
          rows={2}
          placeholder="60x60, junta tomada, colocación en seco."
          className="w-full rounded-md border border-border bg-surface-2/60 p-3.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">
          Imagen <span className="font-normal text-fg-subtle">(opcional)</span>
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(e) => upload(e.target.files?.[0])}
          className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-full file:border file:border-border file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-medium file:text-fg"
        />
        {uploading && <p className="mt-2 text-xs text-fg-muted">Subiendo…</p>}
        {uploadError && <p className="mt-2 text-xs text-danger">{uploadError}</p>}
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.cdnUrl}
            alt=""
            className="mt-3 h-16 w-24 rounded-md border border-border object-cover"
          />
        )}
      </div>

      <SubmitButton />
    </form>
  )
}

export function DeleteFinishButton({
  projectId,
  finishId,
}: {
  projectId: string
  finishId: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        Borrar
      </Button>
    )
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteFinishAction(projectId, finishId)
            setConfirming(false)
          })
        }
      >
        {pending ? '…' : 'Confirmar'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        No
      </Button>
    </div>
  )
}
