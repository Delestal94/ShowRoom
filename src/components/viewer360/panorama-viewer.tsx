'use client'

import { useEffect, useRef } from 'react'

interface PanoramaViewerProps {
  imageUrl: string
  title?: string
}

declare global {
  interface Window {
    pannellum: any
  }
}

export function PanoramaViewer({ imageUrl, title }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerId = useRef(`panorama-${Math.random().toString(36).substring(7)}`)

  useEffect(() => {
    if (!containerRef.current) return

    let viewer: { destroy?: () => void } | null = null
    let cancelled = false

    // Pannellum loads from a CDN script, so it may not be on `window` yet when
    // this mounts. Poll briefly instead of silently rendering an empty box.
    const start = Date.now()
    const init = () => {
      if (cancelled) return

      if (!window.pannellum) {
        if (Date.now() - start > 10_000) {
          console.error('Pannellum no cargó: el visor 360 no se puede inicializar')
          return
        }
        window.setTimeout(init, 100)
        return
      }

      try {
        viewer = window.pannellum.viewer(viewerId.current, {
          type: 'equirectangular',
          panorama: imageUrl,
          autoLoad: true,
          showControls: true,
          mouseZoom: true,
          keyboardZoom: true,
          pitch: 0,
          yaw: 0,
          hfov: 100,
        })
      } catch (error) {
        console.error('Failed to initialize Pannellum viewer:', error)
      }
    }

    init()

    return () => {
      cancelled = true
      viewer?.destroy?.()
    }
  }, [imageUrl])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        ref={containerRef}
        id={viewerId.current}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {title && (
        <p className="pointer-events-none absolute left-4 top-4 rounded-full border border-border bg-bg/70 px-3 py-1.5 text-xs text-fg backdrop-blur">
          {title}
        </p>
      )}

      <p className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-border bg-bg/70 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur">
        Arrastrá para mirar alrededor · Scroll para acercar
      </p>
    </div>
  )
}
