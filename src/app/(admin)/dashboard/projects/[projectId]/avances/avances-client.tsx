'use client'

import { useRef, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import {
  createUpdateAction,
  togglePublishAction,
  deleteUpdateAction,
  notifyUpdateAction,
  type UpdateState,
} from './actions'

interface UploadedImage {
  storageKey: string
  cdnUrl: string
}

const inputCls =
  'h-11 w-full rounded-md border border-border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar avance'}
    </Button>
  )
}

export function NewUpdateForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [state, formAction] = useFormState<UpdateState, FormData>(
    async (prev, formData) => {
      formData.set('images', JSON.stringify(images))
      const result = await createUpdateAction(projectId, prev, formData)
      if (!result.error) {
        formRef.current?.reset()
        setImages([])
      }
      return result
    },
    {}
  )

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setUploadError('')

    try {
      for (const file of Array.from(files).slice(0, 6)) {
        const presign = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            tourKind: 'image',
            fileName: `avance-${Date.now()}-${file.name}`,
          }),
        })

        if (!presign.ok) {
          const body = await presign.json().catch(() => ({}))
          setUploadError(body.error ?? 'No se pudo preparar la subida')
          break
        }

        const { presignedUrl, storageKey, cdnUrl } = await presign.json()

        const put = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!put.ok) {
          setUploadError(`Falló la subida de ${file.name}`)
          break
        }

        setImages((prev) => [...prev, { storageKey, cdnUrl }])
      }
    } catch {
      setUploadError('Falló la subida. Probá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
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

      <div>
        <label htmlFor="up-title" className="mb-1.5 block text-sm font-medium text-fg">
          Título
        </label>
        <input
          id="up-title"
          name="title"
          required
          placeholder="Terminó la estructura del piso 8"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="up-body" className="mb-1.5 block text-sm font-medium text-fg">
          Detalle <span className="font-normal text-fg-subtle">(opcional)</span>
        </label>
        <textarea
          id="up-body"
          name="body"
          rows={4}
          placeholder="Contales qué se hizo este mes y qué sigue."
          className="w-full rounded-md border border-border bg-surface-2/60 p-3.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div>
        <label htmlFor="up-progress" className="mb-1.5 block text-sm font-medium text-fg">
          Avance total <span className="font-normal text-fg-subtle">(opcional)</span>
        </label>
        <input
          id="up-progress"
          name="progress"
          inputMode="numeric"
          placeholder="45"
          className={cn(inputCls, 'max-w-32')}
        />
        <p className="mt-1.5 text-xs text-fg-subtle">
          Porcentaje de 0 a 100. Se muestra como barra en la página pública.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">
          Fotos <span className="font-normal text-fg-subtle">(opcional)</span>
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
          className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-full file:border file:border-border file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-medium file:text-fg hover:file:bg-surface-2/70"
        />
        {uploading && <p className="mt-2 text-xs text-fg-muted">Subiendo…</p>}
        {uploadError && <p className="mt-2 text-xs text-danger">{uploadError}</p>}

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.storageKey}
                src={img.cdnUrl}
                alt=""
                className="h-16 w-24 rounded-md border border-border object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2.5 text-sm text-fg">
        <input
          type="checkbox"
          name="publish"
          defaultChecked
          className="h-4 w-4 rounded border-border bg-surface-2 accent-[oklch(0.62_0.21_275)]"
        />
        Publicar ahora
      </label>

      <SubmitButton />
    </form>
  )
}

export function UpdateActions({
  projectId,
  updateId,
  published,
  notified,
}: {
  projectId: string
  updateId: string
  published: boolean
  notified: boolean
}) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const run = (fn: () => Promise<UpdateState>) => {
    setMessage(null)
    startTransition(async () => {
      const result = await fn()
      if (result.error) setMessage({ text: result.error, ok: false })
      else if (result.notice) setMessage({ text: result.notice, ok: true })
      setConfirming(false)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => togglePublishAction(projectId, updateId))}
        >
          {published ? 'Despublicar' : 'Publicar'}
        </Button>

        {published && !notified && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => notifyUpdateAction(projectId, updateId))}
          >
            Avisar por mail
          </Button>
        )}

        {confirming ? (
          <>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => run(() => deleteUpdateAction(projectId, updateId))}
            >
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              No
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            Borrar
          </Button>
        )}
      </div>

      {message && (
        <p
          className={cn(
            'max-w-sm text-right text-xs',
            message.ok ? 'text-success' : 'text-danger'
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
