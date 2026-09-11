'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { canvasToPngBlob, loadPdf, renderPdfPage, type LoadedPdf } from './pdf-source'

export function CreateFloorPlanForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Un plano puede venir como imagen directa o como una página rasterizada
  // de un PDF — en ambos casos terminamos con un Blob + un nombre de archivo
  // para subir, y una URL para previsualizar.
  const [uploadBlob, setUploadBlob] = useState<Blob | null>(null)
  const [uploadFileName, setUploadFileName] = useState('')
  const [sourceKind, setSourceKind] = useState<'image' | 'pdf'>('image')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [pdf, setPdf] = useState<LoadedPdf | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [rendering, setRendering] = useState(false)
  const renderAbortRef = useRef<AbortController | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    previewUrlRef.current = previewUrl
  }, [previewUrl])

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    []
  )

  const setPreview = (blob: Blob) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(blob)
    previewUrlRef.current = url
    setPreviewUrl(url)
  }

  const renderPage = async (loaded: LoadedPdf, page: number) => {
    renderAbortRef.current?.abort()
    const controller = new AbortController()
    renderAbortRef.current = controller
    setRendering(true)
    try {
      const canvas = await renderPdfPage(loaded, page, controller.signal)
      if (controller.signal.aborted) return
      const blob = await canvasToPngBlob(canvas)
      setUploadBlob(blob)
      setPreview(blob)
    } catch {
      if (!controller.signal.aborted) {
        setError('No se pudo renderizar esa página del PDF.')
      }
    } finally {
      if (!controller.signal.aborted) setRendering(false)
    }
  }

  const pickFile = async (selected: File | null) => {
    if (!selected) return
    if (selected.size > 25 * 1024 * 1024) {
      setError('El archivo pesa demasiado (máx 25MB)')
      return
    }

    setError('')
    setPdf(null)

    if (selected.type === 'application/pdf') {
      setSourceKind('pdf')
      setUploadFileName(selected.name.replace(/\.pdf$/i, '') + '.png')
      if (!name) setName(selected.name.replace(/\.pdf$/i, ''))
      try {
        const loaded = await loadPdf(selected)
        setPdf(loaded)
        setPageNum(1)
        await renderPage(loaded, 1)
      } catch {
        setError('No se pudo leer el PDF. Probá exportarlo a PNG o JPG.')
      }
      return
    }

    if (!selected.type.startsWith('image/')) {
      setError('Ese archivo no es una imagen ni un PDF. Subí un PNG, JPG, WebP o PDF.')
      return
    }

    setSourceKind('image')
    setUploadBlob(selected)
    setUploadFileName(selected.name)
    setPreview(selected)
    if (!name) setName(selected.name.replace(/\.[^.]+$/, ''))
  }

  const changePage = (delta: number) => {
    if (!pdf) return
    const next = Math.min(pdf.numPages, Math.max(1, pageNum + delta))
    if (next === pageNum) return
    setPageNum(next)
    renderPage(pdf, next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadBlob) {
      setError('Subí el plano primero')
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
        body: JSON.stringify({ projectId, tourKind: 'image', fileName: uploadFileName }),
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
        headers: { 'Content-Type': uploadBlob.type || 'image/png' },
        body: uploadBlob,
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
          sourceKind,
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
          'flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface/40 hover:border-border-strong'
        )}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="w-full">
            <div className="relative mx-auto max-h-48 w-fit overflow-hidden rounded-md border border-border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Vista previa del plano" className="max-h-48 w-auto" />
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              {sourceKind === 'pdf' ? uploadFileName.replace(/\.png$/, '.pdf') : uploadFileName}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-fg">Arrastrá o hacé clic para subir el plano</p>
            <p className="mt-2 max-w-sm text-xs text-fg-muted">
              PNG, JPG, WebP o PDF. Cuanto más limpio el plano —sin muebles ni sombreados— mejor
              funciona la detección automática.
            </p>
          </>
        )}
      </label>

      {pdf && pdf.numPages > 1 && (
        <div
          className="flex items-center justify-center gap-3"
          onClick={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={() => changePage(-1)}
            disabled={pageNum <= 1 || rendering}
            className="rounded-full border border-border px-3 py-1 text-sm text-fg disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-fg-muted">
            Página {pageNum} de {pdf.numPages}
          </span>
          <button
            type="button"
            onClick={() => changePage(1)}
            disabled={pageNum >= pdf.numPages || rendering}
            className="rounded-full border border-border px-3 py-1 text-sm text-fg disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

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

      <Button type="submit" disabled={!uploadBlob || loading || rendering} className="w-full">
        {loading ? 'Creando…' : 'Crear planta y empezar a trazar'}
      </Button>
    </form>
  )
}
