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
    if (!containerRef.current || !window.pannellum) return

    try {
      // Initialize Pannellum viewer
      window.pannellum.viewer(viewerId.current, {
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
  }, [imageUrl])

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <div
        ref={containerRef}
        id={viewerId.current}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {title && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-sm px-3 py-2 rounded z-10">
          {title}
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded z-10">
        <p>🖱️ Drag to look around • Scroll to zoom</p>
      </div>
    </div>
  )
}
