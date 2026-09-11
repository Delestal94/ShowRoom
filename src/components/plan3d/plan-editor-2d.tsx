'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  distance,
  nearestWall,
  orthoSnap,
  snapToEndpoint,
  type PlanModel,
  type Point,
} from './plan-model'

export type EditorMode = 'calibrate' | 'draw' | 'openings' | 'erase'

interface PlanEditor2DProps {
  model: PlanModel
  mode: EditorMode
  ortho: boolean
  calibrationLine: [Point, Point] | null
  onCalibrationLine: (line: [Point, Point] | null) => void
  onAddWall: (a: Point, b: Point) => void
  onDeleteWall: (id: string) => void
  onAddOpening: (wallId: string, offset: number) => void
  onDeleteOpening: (id: string) => void
}

/** Radio de snap y tolerancia de click, en píxeles de pantalla. */
const SNAP_RADIUS_SCREEN = 14
const HIT_RADIUS_SCREEN = 10

export function PlanEditor2D({
  model,
  mode,
  ortho,
  calibrationLine,
  onCalibrationLine,
  onAddWall,
  onDeleteWall,
  onAddOpening,
  onDeleteOpening,
}: PlanEditor2DProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const layerRef = useRef<SVGGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const [chainStart, setChainStart] = useState<Point | null>(null)
  const [calibrationStart, setCalibrationStart] = useState<Point | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [shiftHeld, setShiftHeld] = useState(false)
  const [renderedWidth, setRenderedWidth] = useState(0)
  const panRef = useRef<{ x: number; y: number } | null>(null)

  // Un píxel de pantalla, expresado en píxeles de la imagen: mantiene los
  // trazos y los radios de snap con grosor constante a cualquier zoom.
  const unit =
    renderedWidth > 0 ? model.imageWidth / renderedWidth / view.zoom : 1

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setRenderedWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setShiftHeld(e.shiftKey)
      if (e.key === 'Escape') {
        setChainStart(null)
        setCalibrationStart(null)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  // Cambiar de herramienta deja cualquier trazo a medias sin terminar.
  useEffect(() => {
    setChainStart(null)
    setCalibrationStart(null)
  }, [mode])

  const toPlanPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const layer = layerRef.current
    const svg = svgRef.current
    if (!layer || !svg) return null
    const ctm = layer.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  /** Aplica snap a extremo y, si corresponde, ortogonalidad respecto del origen. */
  const resolvePoint = useCallback(
    (raw: Point, from: Point | null): Point => {
      const snapped = snapToEndpoint(model, raw, SNAP_RADIUS_SCREEN * unit)
      if (snapped) return snapped
      const useOrtho = ortho !== shiftHeld
      return from && useOrtho ? orthoSnap(from, raw) : raw
    },
    [model, unit, ortho, shiftHeld]
  )

  const handleMove = (e: React.MouseEvent) => {
    if (panRef.current) {
      setView((v) => ({
        ...v,
        x: v.x + (e.clientX - panRef.current!.x),
        y: v.y + (e.clientY - panRef.current!.y),
      }))
      panRef.current = { x: e.clientX, y: e.clientY }
      return
    }
    const raw = toPlanPoint(e.clientX, e.clientY)
    if (raw) setCursor(resolvePoint(raw, chainStart ?? calibrationStart))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      panRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const endPan = () => {
    panRef.current = null
  }

  const handleClick = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const raw = toPlanPoint(e.clientX, e.clientY)
    if (!raw) return

    if (mode === 'calibrate') {
      const point = calibrationStart ? resolvePoint(raw, calibrationStart) : raw
      if (!calibrationStart) {
        setCalibrationStart(point)
        onCalibrationLine(null)
      } else {
        onCalibrationLine([calibrationStart, point])
        setCalibrationStart(null)
      }
      return
    }

    if (mode === 'draw') {
      const point = resolvePoint(raw, chainStart)
      if (!chainStart) {
        setChainStart(point)
      } else {
        if (distance(chainStart, point) > 2 * unit) onAddWall(chainStart, point)
        // Encadena: el fin de un muro es el principio del siguiente, que es
        // como se recorre el perímetro de una planta.
        setChainStart(point)
      }
      return
    }

    if (mode === 'openings') {
      const hit = nearestWall(model, raw, HIT_RADIUS_SCREEN * unit * 2)
      if (hit) onAddOpening(hit.wall.id, hit.offset)
      return
    }

    if (mode === 'erase') {
      const openingHit = findOpeningAt(model, raw, HIT_RADIUS_SCREEN * unit)
      if (openingHit) {
        onDeleteOpening(openingHit)
        return
      }
      const hit = nearestWall(model, raw, HIT_RADIUS_SCREEN * unit * 2)
      if (hit) onDeleteWall(hit.wall.id)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setChainStart(null)
    setCalibrationStart(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setView((v) => {
      const zoom = Math.min(12, Math.max(0.4, v.zoom * factor))
      const applied = zoom / v.zoom
      // Mantiene fijo el punto bajo el cursor mientras se acerca.
      const ox = e.clientX - rect.left
      const oy = e.clientY - rect.top
      return { zoom, x: ox - (ox - v.x) * applied, y: oy - (oy - v.y) * applied }
    })
  }

  const scale = model.pxPerMeter ?? 0
  const preview = chainStart && cursor ? ([chainStart, cursor] as [Point, Point]) : null
  const calibrationPreview =
    calibrationStart && cursor ? ([calibrationStart, cursor] as [Point, Point]) : null

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-surface-2"
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        className="h-full w-full"
        style={{ cursor: mode === 'erase' ? 'not-allowed' : 'crosshair' }}
        onMouseMove={handleMove}
        onMouseDown={handleMouseDown}
        onMouseUp={endPan}
        onMouseLeave={() => {
          endPan()
          setCursor(null)
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
          <g ref={layerRef}>
            {model.imageUrl && (
              <image
                href={model.imageUrl}
                width={model.imageWidth}
                height={model.imageHeight}
                style={{ opacity: mode === 'calibrate' ? 1 : 0.55 }}
              />
            )}

            {model.walls.map((wall) => {
              const strokeWidth = Math.max(2 * unit, wall.thickness * scale)
              return (
                <g key={wall.id}>
                  <line
                    x1={wall.a.x}
                    y1={wall.a.y}
                    x2={wall.b.x}
                    y2={wall.b.y}
                    stroke="oklch(0.72 0.16 250)"
                    strokeWidth={strokeWidth}
                    strokeOpacity={0.85}
                  />
                  <circle cx={wall.a.x} cy={wall.a.y} r={3 * unit} fill="oklch(0.72 0.16 250)" />
                  <circle cx={wall.b.x} cy={wall.b.y} r={3 * unit} fill="oklch(0.72 0.16 250)" />
                </g>
              )
            })}

            {model.openings.map((opening) => {
              const wall = model.walls.find((w) => w.id === opening.wallId)
              if (!wall || !scale) return null
              const len = distance(wall.a, wall.b)
              if (len === 0) return null
              const dx = (wall.b.x - wall.a.x) / len
              const dy = (wall.b.y - wall.a.y) / len
              const c = {
                x: wall.a.x + dx * opening.offset * scale,
                y: wall.a.y + dy * opening.offset * scale,
              }
              const half = (opening.width / 2) * scale
              const color =
                opening.kind === 'door' ? 'oklch(0.78 0.17 65)' : 'oklch(0.8 0.14 195)'
              return (
                <line
                  key={opening.id}
                  x1={c.x - dx * half}
                  y1={c.y - dy * half}
                  x2={c.x + dx * half}
                  y2={c.y + dy * half}
                  stroke={color}
                  strokeWidth={Math.max(3 * unit, wall.thickness * scale * 1.1)}
                  strokeLinecap="butt"
                />
              )
            })}

            {preview && (
              <line
                x1={preview[0].x}
                y1={preview[0].y}
                x2={preview[1].x}
                y2={preview[1].y}
                stroke="oklch(0.85 0.18 145)"
                strokeWidth={2 * unit}
                strokeDasharray={`${6 * unit} ${4 * unit}`}
              />
            )}

            {(calibrationLine || calibrationPreview) && (
              <line
                x1={(calibrationLine ?? calibrationPreview)![0].x}
                y1={(calibrationLine ?? calibrationPreview)![0].y}
                x2={(calibrationLine ?? calibrationPreview)![1].x}
                y2={(calibrationLine ?? calibrationPreview)![1].y}
                stroke="oklch(0.85 0.19 30)"
                strokeWidth={2.5 * unit}
              />
            )}

            {cursor && mode !== 'erase' && (
              <circle
                cx={cursor.x}
                cy={cursor.y}
                r={4 * unit}
                fill="none"
                stroke="oklch(0.85 0.18 145)"
                strokeWidth={1.5 * unit}
              />
            )}
          </g>
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2">
        <span className="rounded-full border border-border bg-bg/80 px-2.5 py-1 text-[11px] text-fg-muted backdrop-blur">
          {Math.round(view.zoom * 100)}%
        </span>
        {preview && scale > 0 && (
          <span className="rounded-full border border-border bg-bg/80 px-2.5 py-1 text-[11px] font-medium text-fg backdrop-blur">
            {(distance(preview[0], preview[1]) / scale).toFixed(2)} m
          </span>
        )}
        {calibrationPreview && (
          <span className="rounded-full border border-border bg-bg/80 px-2.5 py-1 text-[11px] text-fg-muted backdrop-blur">
            Marcá el segundo punto
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setView({ zoom: 1, x: 0, y: 0 })}
        className="absolute bottom-3 right-3 rounded-full border border-border bg-bg/80 px-2.5 py-1 text-[11px] text-fg-muted backdrop-blur transition-colors hover:text-fg"
      >
        Centrar vista
      </button>
    </div>
  )
}

/** Id de la abertura bajo el punto, si hay alguna. */
function findOpeningAt(model: PlanModel, point: Point, radiusPx: number): string | null {
  const scale = model.pxPerMeter
  if (!scale) return null

  for (const opening of model.openings) {
    const wall = model.walls.find((w) => w.id === opening.wallId)
    if (!wall) continue
    const len = distance(wall.a, wall.b)
    if (len === 0) continue
    const dx = (wall.b.x - wall.a.x) / len
    const dy = (wall.b.y - wall.a.y) / len
    const c = {
      x: wall.a.x + dx * opening.offset * scale,
      y: wall.a.y + dy * opening.offset * scale,
    }
    if (distance(c, point) <= Math.max(radiusPx, (opening.width / 2) * scale)) {
      return opening.id
    }
  }
  return null
}
