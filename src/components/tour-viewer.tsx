'use client'

import { Suspense, useState, useEffect } from 'react'
import Image from 'next/image'
import { GLBViewer } from './viewer3d/glb-viewer'
import { PanoramaViewer } from './viewer360/panorama-viewer'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/cn'

interface Tour {
  id: string
  kind: '360' | 'glb-model' | 'drone-video' | 'image'
  cdnUrl?: string
  storageKey: string
  metadataJson?: Record<string, any>
}

interface TourViewerProps {
  tours: Tour[]
  selectedTourId?: string
  projectSlug?: string
}

const TOUR_META: Record<string, { icon: string; label: string }> = {
  '360': { icon: '🔄', label: '360°' },
  'glb-model': { icon: '🏢', label: '3D' },
  'drone-video': { icon: '🚁', label: 'Drone' },
  image: { icon: '📷', label: 'Foto' },
}

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-border bg-surface">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="mt-4 text-sm text-fg-muted">Cargando el visor…</p>
      </div>
    </div>
  )
}

export function TourViewer({ tours, selectedTourId, projectSlug }: TourViewerProps) {
  const [currentTourId, setCurrentTourId] = useState(selectedTourId || tours[0]?.id)
  const currentTour = tours.find((t) => t.id === currentTourId)

  useEffect(() => {
    if (projectSlug && currentTourId) {
      trackEvent({
        type: 'tour_view',
        projectSlug,
        tourId: currentTourId,
        metadata: { tour_kind: currentTour?.kind },
      })
    }
  }, [currentTourId, projectSlug, currentTour])

  if (!currentTour?.cdnUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30">
        <div className="px-6 text-center">
          <p className="font-medium text-fg">Todavía no hay un recorrido cargado</p>
          <p className="mt-1 text-sm text-fg-muted">
            Cuando se suba el modelo 3D o las panorámicas, se ven acá.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface">
        <Suspense fallback={<LoadingFallback />}>
          {currentTour.kind === 'glb-model' && (
            <GLBViewer url={currentTour.cdnUrl} enableDayNight initialLighting="day" />
          )}
          {currentTour.kind === '360' && (
            <PanoramaViewer imageUrl={currentTour.cdnUrl} title="Recorrido 360°" />
          )}
          {currentTour.kind === 'image' && (
            <div className="relative h-full w-full">
              <Image
                src={currentTour.cdnUrl}
                alt="Vista del proyecto"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            </div>
          )}
          {currentTour.kind === 'drone-video' && (
            <video src={currentTour.cdnUrl} controls className="h-full w-full bg-black" />
          )}
        </Suspense>
      </div>

      {tours.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tours.map((tour) => {
            const meta = TOUR_META[tour.kind] ?? { icon: '📸', label: 'Tour' }
            const active = currentTourId === tour.id

            return (
              <button
                key={tour.id}
                type="button"
                onClick={() => setCurrentTourId(tour.id)}
                disabled={!tour.cdnUrl}
                title={tour.cdnUrl ? undefined : 'Este recorrido todavía no está listo'}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
                  !tour.cdnUrl && 'cursor-not-allowed opacity-50'
                )}
              >
                <span aria-hidden>{meta.icon}</span>
                {meta.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
