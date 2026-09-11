'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'

export function CreateFloorPlanForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pickFile = (selected: File | null) => {
    if (!selected) return
    // El atributo `accept` del input sólo filtra el selector de archivos: no
    // bloquea un archivo soltado por drag & drop. Sin esta validación, un
    // PDF pasa el formulario entero y recién falla en el editor, con un
    // error que no dice qué lo causó.
    if (!selected.type.startsWith('image/')) {
      setError(
        selected.type === 'application/pdf'
          ? 'Ese archivo es un PDF. Por ahora sólo se aceptan imágenes: exportá la página del plano a PNG o JPG y subí eso.'
          : 'Ese archivo no es una imagen. Subí un PNG, JPG o WebP.'
      )
      return
    }
    if (selected.size > 25 * 1024 * 1024) {
      setError('El archivo pesa demasiado (máx 25MB)')
      return
    }
    setError('')
    setFile(selected)
    if (!name) {
      // Nombre de arranque razonable; el usuario lo puede cambiar antes de crear.
      setName(selected.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Subí una imagen del plano primero')
      return
    }
    if (!name.trim()) {
      setError('Ponele un nombre a la planta')
      return
    }

    setLoading(true)
    setError('')

    try {
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, tourKind: 'image', fileName: file.name }),
      })
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}))
        setError(body.error ?? 'No se pudo preparar la subida')
        setLoading(false)
        return
      }
      const { presignedUrl, storageKey, cdnUrl } = await presignRes.json()

      const putRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) {
        setError('La subida del plano falló. Probá de nuevo.')
        setLoading(false)
        return
      }

      const createRes = await fetch(`/api/dashboard/projects/${projectId}/floor-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          level: level.trim() ? Number(level) : undefined,
          sourceStorageKey: storageKey,
          sourceCdnUrl: cdnUrl,
          sourceKind: 'image',
        }),
      })
      if (!createRes.ok) {
        setError('El plano se subió, pero no se pudo crear la planta.')
        setLoading(false)
        return
      }

      const { floorPlan } = await createRes.json()
      router.push(`/dashboard/projects/${projectId}/plano-3d/${floorPlan.id}`)
    } catch {
      setError('Algo falló. Probá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          pickFile(e.dataTransfer.files?.[0] ?? null)
        }}
        className={cn(
          'flex h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface/40 hover:border-border-strong'
        )}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-sm font-medium text-fg">
          {file ? file.name : 'Arrastrá o hacé clic para subir el plano'}
        </p>
        <p className="mt-2 max-w-sm text-xs text-fg-muted">
          PNG, JPG o WebP. Cuanto más limpio el plano —sin muebles ni sombreados— mejor funciona
          la detección automática. PDF todavía no se acepta: exportalo a imagen primero.
        </p>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <label className="block">
          <span className="text-xs text-fg-muted">Nombre de la planta</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Planta baja"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-border-strong"
          />
        </label>
        <label className="block">
          <span className="text-xs text-fg-muted">Piso (opcional)</span>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-border-strong"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!file || loading} className="w-full">
        {loading ? 'Creando…' : 'Crear planta y empezar a trazar'}
      </Button>
    </form>
  )
}
