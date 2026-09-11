/**
 * Detección de muros ortogonales sobre un plano rasterizado.
 *
 * Busca tiras de tinta largas y finas: binariza la imagen y agrupa corridas de
 * píxeles oscuros contiguas fila por fila (y después columna por columna). Una
 * corrida larga y de poco espesor es un muro; una mancha ancha es un hatch, un
 * bloque de texto o una carátula, y se descarta por espesor.
 *
 * Los umbrales se expresan en metros, no en píxeles, así que el detector
 * necesita el plano ya calibrado: sin escala no hay forma de distinguir un muro
 * de una línea de cota.
 *
 * Limitación conocida: sólo encuentra muros horizontales y verticales. Los
 * muros en diagonal y los curvos hay que trazarlos a mano.
 */

import type { Wall } from './plan-model'
import { createId } from './plan-model'

export interface DetectOptions {
  /** Píxeles por metro en las coordenadas de la imagen original. */
  pxPerMeter: number
  /** Luminancia 0–255 por debajo de la cual un píxel cuenta como tinta. */
  threshold: number
  minLengthM: number
  maxThicknessM: number
  wallHeight: number
}

/** Ancho máximo de trabajo: acota el costo sin perder muros. */
const MAX_WORK_SIZE = 1400
/** Una tira más gruesa que larga es una mancha, no un muro. */
const MIN_ASPECT_RATIO = 4
/**
 * Ni el tabique más fino baja de esto. Sin este piso, las líneas de cota y los
 * ejes —largos, rectos y de un solo píxel— entran como muros de 2 cm.
 */
const MIN_THICKNESS_M = 0.05
const MAX_WALLS = 300

interface Run {
  start: number
  end: number
}

interface Group {
  start: number
  end: number
  from: number
  to: number
}

/** Corridas de tinta en una línea, con un largo mínimo. */
function findRuns(ink: Uint8Array, offset: number, step: number, count: number, minRun: number): Run[] {
  const runs: Run[] = []
  let runStart = -1

  for (let i = 0; i < count; i++) {
    const isInk = ink[offset + i * step] === 1
    if (isInk && runStart === -1) runStart = i
    if ((!isInk || i === count - 1) && runStart !== -1) {
      const end = isInk ? i : i - 1
      if (end - runStart + 1 >= minRun) runs.push({ start: runStart, end })
      runStart = -1
    }
  }

  return runs
}

/**
 * Agrupa corridas de líneas consecutivas que se solapan, para reconstruir una
 * tira de varios píxeles de espesor a partir de sus filas sueltas.
 */
function groupRuns(
  runsByLine: Run[][],
  minRun: number,
  minThickness: number,
  maxThickness: number
): Group[] {
  const closed: Group[] = []
  let active: Group[] = []

  const close = (group: Group) => {
    const thickness = group.to - group.from + 1
    const length = group.end - group.start + 1
    if (
      thickness >= minThickness &&
      thickness <= maxThickness &&
      length >= minRun &&
      length >= thickness * MIN_ASPECT_RATIO
    ) {
      closed.push(group)
    }
  }

  runsByLine.forEach((runs, line) => {
    const next: Group[] = []
    const used = new Set<Group>()

    for (const run of runs) {
      let best: Group | null = null
      let bestOverlap = 0

      for (const group of active) {
        if (used.has(group)) continue
        const overlap = Math.min(group.end, run.end) - Math.max(group.start, run.start) + 1
        const shorter = Math.min(group.end - group.start, run.end - run.start) + 1
        if (overlap > 0 && overlap >= shorter * 0.5 && overlap > bestOverlap) {
          best = group
          bestOverlap = overlap
        }
      }

      if (best) {
        used.add(best)
        best.start = Math.min(best.start, run.start)
        best.end = Math.max(best.end, run.end)
        best.to = line
        next.push(best)
      } else {
        next.push({ start: run.start, end: run.end, from: line, to: line })
      }
    }

    for (const group of active) if (!used.has(group)) close(group)
    active = next
  })

  for (const group of active) close(group)
  return closed
}

export function detectWalls(image: HTMLImageElement, options: DetectOptions): Wall[] {
  const { naturalWidth: srcW, naturalHeight: srcH } = image
  if (!srcW || !srcH) return []

  const scale = Math.min(1, MAX_WORK_SIZE / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  // Los planos suelen venir con fondo transparente o blanco: pintarlo evita
  // que el alfa se lea como tinta.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(image, 0, 0, w, h)

  const { data } = ctx.getImageData(0, 0, w, h)
  const ink = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const p = i * 4
    const luminance = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
    ink[i] = luminance < options.threshold ? 1 : 0
  }

  const pxPerMeter = options.pxPerMeter * scale
  const minRun = Math.max(4, options.minLengthM * pxPerMeter)
  const minThickness = Math.max(2, MIN_THICKNESS_M * pxPerMeter)
  const maxThickness = Math.max(minThickness, options.maxThicknessM * pxPerMeter)

  const horizontalRuns: Run[][] = []
  for (let y = 0; y < h; y++) {
    horizontalRuns.push(findRuns(ink, y * w, 1, w, minRun))
  }

  const verticalRuns: Run[][] = []
  for (let x = 0; x < w; x++) {
    verticalRuns.push(findRuns(ink, x, w, h, minRun))
  }

  const walls: Wall[] = []

  for (const g of groupRuns(horizontalRuns, minRun, minThickness, maxThickness)) {
    const y = (g.from + g.to) / 2 / scale
    walls.push({
      id: createId('wall'),
      a: { x: g.start / scale, y },
      b: { x: g.end / scale, y },
      thickness: (g.to - g.from + 1) / pxPerMeter,
      height: options.wallHeight,
    })
  }

  for (const g of groupRuns(verticalRuns, minRun, minThickness, maxThickness)) {
    const x = (g.from + g.to) / 2 / scale
    walls.push({
      id: createId('wall'),
      a: { x, y: g.start / scale },
      b: { x, y: g.end / scale },
      thickness: (g.to - g.from + 1) / pxPerMeter,
      height: options.wallHeight,
    })
  }

  return walls
    .sort((a, b) => Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y) - Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y))
    .slice(0, MAX_WALLS)
}
