'use client'

import { Suspense, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/cn'

/**
 * three.js pesa ~25 MB en disco y varios cientos de kB en el bundle. Cargarlo
 * estático hacía que una página con sólo fotos y 360 arrastrara todo el motor
 * 3D igual — caro sobre todo en móvil, que es donde se mira un proyecto.
 *
 * ssr:false porque el Canvas necesita WebGL: no hay nada que renderizar en el
 * servidor.
 */
const GLBViewer = dynamic(
  () => import('./viewer3d/glb-viewer').then((m) => m.GLBViewer),
  { ssr: false, loading: () => <ViewerSkeleton label="Cargando el modelo 3D…" /> }
)

const PanoramaViewer = dynamic(
  () => import('./viewer360/panorama-viewer').then((m) => m.PanoramaViewer),
  { ssr: false, loading: () => <ViewerSkeleton label="Cargando la panorámica…" /> }
)

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
  /** Edge-to-edge, no card chrome — used for the full-bleed hero background. */
  bleed?: boolean
}

const TOUR_META: Record<string, { icon: string; label: string }> = {
  '360': { icon: '🔄', label: '360°' },
  'glb-model': { icon: '🏢', label: '3D' },
  'drone-video': { icon: '🚁', label: 'Drone' },
  image: { icon: '📷', label: 'Foto' },
}

function ViewerSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="mt-4 text-sm text-fg-muted">{label}</p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return <ViewerSkeleton label="Cargando el visor…" />
}

export function TourViewer({ tours, selectedTourId, projectSlug, bleed = false }: TourViewerProps) {
  const [currentTourId, setCurrentTourId] = useState(selectedTourId || tours[0]?.id)
  const [autoplay, setAutoplay] = useState(true)
  const currentTour = tours.find((t) => t.id === currentTourId)

  // Sólo entre fotos: pasar de un tour 3D o 360° al siguiente cortaría al
  // visitante en medio de un giro que inició a propósito.
  const imageTours = tours.filter((t) => t.kind === 'image' && t.cdnUrl)

  useEffect(() => {
    if (!autoplay || !currentTour || currentTour.kind !== 'image' || imageTours.length < 2) return
    const timer = setInterval(() => {
      setCurrentTourId((id) => {
        const idx = imageTours.findIndex((t) => t.id === id)
        return imageTours[(idx + 1) % imageTours.length]?.id ?? id
      })
    }, 6000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, currentTour?.kind, imageTours.length])

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

  const selectTour = (id: string) => {
    setAutoplay(false)
    setCurrentTourId(id)
  }

  if (!currentTour?.cdnUrl) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center border-dashed border-border bg-surface/30',
          bleed ? 'border-0' : 'rounded-2xl border'
        )}
      >
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
    <div className={cn('relative flex h-full w-full', bleed ? '' : 'flex-col')}>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-hidden bg-surface',
          bleed ? 'h-full w-full' : 'rounded-2xl border border-border'
        )}
      >
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
        <div
          className={cn(
            'flex flex-wrap gap-2',
            bleed ? 'pointer-events-auto absolute left-5 top-[5.5rem] max-w-[calc(100%-2.5rem)] sm:top-6 lg:max-w-[60%]' : 'mt-3'
          )}
        >
          {tours.map((tour) => {
            const meta = TOUR_META[tour.kind] ?? { icon: '📸', label: 'Tour' }
            const active = currentTourId === tour.id

            return (
              <button
                key={tour.id}
                type="button"
                onClick={() => selectTour(tour.id)}
                disabled={!tour.cdnUrl}
                title={tour.cdnUrl ? undefined : 'Este recorrido todavía no está listo'}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur transition-colors',
                  active
                    ? 'border-primary bg-primary/90 text-primary-fg'
                    : bleed
                    ? 'border-white/25 bg-black/30 text-white/80 hover:border-white/40 hover:text-white'
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
