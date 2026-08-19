'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export interface ListField {
  key: string
  label: string
  placeholder?: string
  /** Campo largo: se renderiza como textarea. */
  long?: boolean
  /** Sube una imagen al storage y guarda su URL en este campo. */
  image?: boolean
}

type Item = Record<string, string>

const inputCls =
  'h-10 w-full rounded-md border border-border bg-surface-2/60 px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'

/**
 * Editor de listas de objetos guardadas en jsonb (amenities, financiación,
 * trayectoria).
 *
 * Se edita todo en memoria y se guarda de una: son listas cortas que se
 * revisan enteras, y guardar fila por fila multiplicaría los estados
 * intermedios sin ganancia.
 */
export function ListEditor({
  name,
  fields,
  initial,
  addLabel = 'Agregar',
  uploadProjectId,
}: {
  /** Nombre del input oculto que lleva el JSON al Server Action. */
  name: string
  fields: ListField[]
  initial: Item[]
  addLabel?: string
  /** Necesario si algún campo es `image`. */
  uploadProjectId?: string
}) {
  const [items, setItems] = useState<Item[]>(initial)
  const [uploadingAt, setUploadingAt] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')

  const update = (index: number, key: string, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    )
  }

  const uploadImage = async (index: number, key: string, file: File | undefined) => {
    if (!file || !uploadProjectId) return
    setUploadingAt(index)
    setUploadError('')

    try {
      const presign = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: uploadProjectId,
          tourKind: 'image',
          fileName: `seccion-${Date.now()}-${file.name}`,
        }),
      })
      if (!presign.ok) {
        const body = await presign.json().catch(() => ({}))
        setUploadError(body.error ?? 'No se pudo preparar la subida')
        return
      }

      const { presignedUrl, cdnUrl } = await presign.json()
      const put = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!put.ok) {
        setUploadError('Falló la subida')
        return
      }
      update(index, key, cdnUrl)
    } finally {
      setUploadingAt(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Lo que realmente viaja al servidor. */}
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {items.map((item, index) => (
        <div key={index} className="rounded-md border border-border bg-surface-2/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.key}
                className={field.long || field.image ? 'sm:col-span-2' : undefined}
              >
                <label className="mb-1.5 block text-xs font-medium text-fg-muted">
                  {field.label}
                </label>

                {field.image ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingAt === index}
                      onChange={(e) => uploadImage(index, field.key, e.target.files?.[0])}
                      className="text-sm text-fg-muted file:mr-3 file:rounded-full file:border file:border-border file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fg"
                    />
                    {uploadingAt === index && (
                      <span className="text-xs text-fg-muted">Subiendo…</span>
                    )}
                    {item[field.key] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item[field.key]}
                        alt=""
                        className="h-12 w-16 rounded border border-border object-cover"
                      />
                    )}
                  </div>
                ) : field.long ? (
                  <textarea
                    rows={2}
                    value={item[field.key] ?? ''}
                    onChange={(e) => update(index, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-border bg-surface-2/60 p-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
                  />
                ) : (
                  <input
                    value={item[field.key] ?? ''}
                    onChange={(e) => update(index, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={inputCls}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            >
              Quitar
            </Button>
          </div>
        </div>
      ))}

      {uploadError && <p className="text-xs text-danger">{uploadError}</p>}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setItems((prev) => [...prev, {}])}
      >
        + {addLabel}
      </Button>
    </div>
  )
}
