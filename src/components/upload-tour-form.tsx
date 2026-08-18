'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'

type TourKind = '360' | 'glb-model' | 'drone-video' | 'image'

interface UploadTourFormProps {
  projectId: string
  unitId?: string
  onSuccess?: () => void
}

const TOUR_TYPES: { value: TourKind; label: string; accept: string; icon: string }[] = [
  { value: 'glb-model', label: 'Modelo 3D', accept: '.glb,.gltf', icon: '🏢' },
  { value: '360', label: 'Panorámica 360°', accept: 'image/jpeg,image/png', icon: '🔄' },
  { value: 'image', label: 'Foto', accept: 'image/jpeg,image/png,image/webp', icon: '📷' },
  { value: 'drone-video', label: 'Video drone', accept: 'video/mp4,video/webm', icon: '🚁' },
]

const MAX_MB: Record<TourKind, number> = {
  'glb-model': 50,
  '360': 100,
  image: 100,
  'drone-video': 500,
}

export function UploadTourForm({ projectId, unitId, onSuccess }: UploadTourFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [kind, setKind] = useState<TourKind>('glb-model')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const selectedType = TOUR_TYPES.find((t) => t.value === kind)!

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    const maxSize = MAX_MB[kind] * 1024 * 1024
    if (selected.size > maxSize) {
      setError(`El archivo pesa demasiado (máx ${MAX_MB[kind]}MB)`)
      return
    }
    setError('')
    setFile(selected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Elegí un archivo primero')
      return
    }

    setLoading(true)
    setError('')
    setProgress(0)

    try {
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, tourKind: kind, fileName: file.name }),
      })

      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}))
        setError(body.error ?? 'No se pudo preparar la subida')
        setLoading(false)
        return
      }

      const { presignedUrl, storageKey, cdnUrl } = await presignRes.json()

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (ev) => {
        if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
      })

      xhr.addEventListener('load', async () => {
        if (xhr.status !== 200) {
          setError(`La subida falló (HTTP ${xhr.status})`)
          setLoading(false)
          return
        }

        try {
          const tourRes = await fetch(`/api/dashboard/projects/${projectId}/tours`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, unitId, storageKey, cdnUrl }),
          })

          if (tourRes.ok) {
            setFile(null)
            setProgress(0)
            onSuccess?.()
            router.refresh()
          } else {
            setError('El archivo subió, pero no se pudo guardar el registro')
          }
        } catch {
          setError('El archivo subió, pero no se pudo guardar el registro')
        } finally {
          setLoading(false)
        }
      })

      xhr.addEventListener('error', () => {
        setError('La subida falló. Probá de nuevo.')
        setLoading(false)
      })
      xhr.addEventListener('abort', () => {
        setError('Subida cancelada')
        setLoading(false)
      })

      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La subida falló')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface/50 p-6">
      <h3 className="font-semibold text-fg">Subir tour</h3>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-fg">Tipo</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOUR_TYPES.map((type) => (
            <label
              key={type.value}
              className={cn(
                'relative flex cursor-pointer flex-col items-center rounded-md border p-3 text-center transition-colors',
                kind === type.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border-strong'
              )}
            >
              <input
                type="radio"
                name="tour-type"
                value={type.value}
                checked={kind === type.value}
                onChange={(ev) => {
                  setKind(ev.target.value as TourKind)
                  setFile(null)
                  setProgress(0)
                  setError('')
                }}
                className="sr-only"
              />
              <span className="text-lg">{type.icon}</span>
              <span className="mt-1 text-xs font-medium text-fg">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-fg">Archivo</p>
        <div className="rounded-md border border-dashed border-border p-6 text-center transition-colors hover:border-border-strong">
          <input
            type="file"
            accept={selectedType.accept}
            onChange={handleFileChange}
            disabled={loading}
            className="sr-only"
            id="file-input"
          />
          <label htmlFor="file-input" className="block cursor-pointer">
            <p className="text-sm font-medium text-fg">
              {file ? file.name : 'Hacé clic o arrastrá el archivo acá'}
            </p>
            <p className="mt-1 text-xs text-fg-subtle">Máx {MAX_MB[kind]}MB</p>
          </label>
        </div>
      </div>

      {progress > 0 && progress < 100 && (
        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-fg-subtle">Subiendo… {progress}%</p>
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!file || loading} className="mt-6 w-full">
        {loading ? `Subiendo… ${progress}%` : 'Subir tour'}
      </Button>
    </form>
  )
}
