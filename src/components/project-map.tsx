'use client'

import { useEffect, useRef } from 'react'

export interface PointOfInterest {
  name: string
  distance?: string
}

interface ProjectMapProps {
  lat: number
  lng: number
  projectName: string
  address?: string
  pointsOfInterest?: PointOfInterest[]
}

/**
 * Leaflet is loaded from a CDN on mount rather than bundled: it's only needed
 * on project pages that actually have coordinates, and it ships its own CSS.
 * CARTO's dark tiles need no API key and match the app's theme.
 */
function loadLeaflet(): Promise<any> {
  const w = window as any
  if (w.L) return Promise.resolve(w.L)

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('leaflet-js') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).L))
      existing.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => resolve((window as any).L)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export function ProjectMap({
  lat,
  lng,
  projectName,
  address,
  pointsOfInterest = [],
}: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return

        const map = L.map(containerRef.current, {
          center: [lat, lng],
          zoom: 15,
          // A map inside a scrolling page shouldn't swallow the wheel.
          scrollWheelZoom: false,
          attributionControl: true,
        })
        mapRef.current = map

        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
          }
        ).addTo(map)

        L.circleMarker([lat, lng], {
          radius: 10,
          color: 'oklch(0.62 0.21 275)',
          fillColor: 'oklch(0.62 0.21 275)',
          fillOpacity: 0.9,
          weight: 3,
        })
          .addTo(map)
          .bindPopup(`<strong>${projectName}</strong>${address ? `<br>${address}` : ''}`)
      })
      .catch(() => {
        // Leaflet unavailable — the address and POI list below still render.
      })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lng, projectName, address])

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="overflow-hidden rounded-2xl border border-border">
        <div ref={containerRef} className="h-80 w-full bg-surface" />
      </div>

      <div className="rounded-2xl border border-border bg-surface/50 p-5">
        <h3 className="font-semibold text-fg">Ubicación</h3>
        {address && <p className="mt-2 text-sm text-fg-muted">{address}</p>}

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Cómo llegar ↗
        </a>

        {pointsOfInterest.length > 0 && (
          <div className="mt-5 border-t border-border pt-5">
            <h4 className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Cerca del proyecto
            </h4>
            <ul className="mt-3 space-y-2">
              {pointsOfInterest.map((poi) => (
                <li key={poi.name} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-fg-muted">{poi.name}</span>
                  {poi.distance && (
                    <span className="shrink-0 font-mono text-xs text-fg-subtle">
                      {poi.distance}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
