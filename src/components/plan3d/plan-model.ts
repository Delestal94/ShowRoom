/**
 * Modelo intermedio entre el plano 2D y el modelo 3D.
 *
 * Las coordenadas de `Point` están en píxeles de la imagen original del plano
 * (no del viewport), así que sobreviven al zoom y al resize. `pxPerMeter` es lo
 * único que las convierte a medidas reales: sin calibrar, el modelo no tiene
 * escala y no se puede extruir.
 */

export interface Point {
  x: number
  y: number
}

export interface Wall {
  id: string
  a: Point
  b: Point
  /** Metros. */
  thickness: number
  /** Metros, de piso a losa. */
  height: number
}

export type OpeningKind = 'door' | 'window'

export interface Opening {
  id: string
  wallId: string
  /** Metros desde el extremo A del muro hasta el centro de la abertura. */
  offset: number
  width: number
  height: number
  /** Antepecho en metros. 0 para puertas. */
  sill: number
  kind: OpeningKind
}

export interface PlanModel {
  imageUrl: string | null
  imageWidth: number
  imageHeight: number
  pxPerMeter: number | null
  walls: Wall[]
  openings: Opening[]
  defaultWallHeight: number
  defaultWallThickness: number
}

export const OPENING_PRESETS: Record<
  OpeningKind,
  { label: string; width: number; height: number; sill: number }
> = {
  door: { label: 'Puerta', width: 0.9, height: 2.1, sill: 0 },
  window: { label: 'Ventana', width: 1.4, height: 1.3, sill: 0.9 },
}

export function emptyPlan(): PlanModel {
  return {
    imageUrl: null,
    imageWidth: 0,
    imageHeight: 0,
    pxPerMeter: null,
    walls: [],
    openings: [],
    defaultWallHeight: 2.6,
    defaultWallThickness: 0.15,
  }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Largo del muro en metros. Devuelve 0 si el plano todavía no está calibrado. */
export function wallLength(wall: Wall, pxPerMeter: number | null): number {
  if (!pxPerMeter) return 0
  return distance(wall.a, wall.b) / pxPerMeter
}

export function totalWallLength(model: PlanModel): number {
  return model.walls.reduce((sum, w) => sum + wallLength(w, model.pxPerMeter), 0)
}

/**
 * Superficie encerrada por los muros, aproximada por el rectángulo que los
 * contiene. No es el m² real de las plantas: sirve como control de cordura de
 * la calibración ("si esto da 400 m² para un monoambiente, la escala está mal").
 */
export function boundingAreaM2(model: PlanModel): number {
  if (!model.pxPerMeter || model.walls.length === 0) return 0
  const xs = model.walls.flatMap((w) => [w.a.x, w.b.x])
  const ys = model.walls.flatMap((w) => [w.a.y, w.b.y])
  const w = (Math.max(...xs) - Math.min(...xs)) / model.pxPerMeter
  const h = (Math.max(...ys) - Math.min(...ys)) / model.pxPerMeter
  return w * h
}

/** Proyecta un punto sobre el segmento del muro y devuelve el offset en metros. */
export function projectOntoWall(
  wall: Wall,
  point: Point,
  pxPerMeter: number
): { offset: number; distancePx: number } {
  const dx = wall.b.x - wall.a.x
  const dy = wall.b.y - wall.a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { offset: 0, distancePx: distance(wall.a, point) }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - wall.a.x) * dx + (point.y - wall.a.y) * dy) / lenSq)
  )
  const proj = { x: wall.a.x + t * dx, y: wall.a.y + t * dy }
  return {
    offset: (t * Math.sqrt(lenSq)) / pxPerMeter,
    distancePx: distance(proj, point),
  }
}

/** Muro más cercano al punto, dentro de un radio en píxeles. */
export function nearestWall(
  model: PlanModel,
  point: Point,
  maxDistancePx: number
): { wall: Wall; offset: number } | null {
  if (!model.pxPerMeter) return null

  let best: { wall: Wall; offset: number; distancePx: number } | null = null
  for (const wall of model.walls) {
    const hit = projectOntoWall(wall, point, model.pxPerMeter)
    if (hit.distancePx > maxDistancePx) continue
    if (!best || hit.distancePx < best.distancePx) {
      best = { wall, offset: hit.offset, distancePx: hit.distancePx }
    }
  }
  return best ? { wall: best.wall, offset: best.offset } : null
}

/** Extremo de muro existente más cercano, para encadenar trazados sin huecos. */
export function snapToEndpoint(
  model: PlanModel,
  point: Point,
  radiusPx: number
): Point | null {
  let best: { point: Point; d: number } | null = null
  for (const wall of model.walls) {
    for (const end of [wall.a, wall.b]) {
      const d = distance(end, point)
      if (d <= radiusPx && (!best || d < best.d)) best = { point: end, d }
    }
  }
  return best ? { ...best.point } : null
}

/** Fuerza el segundo punto a la horizontal o la vertical, la que esté más cerca. */
export function orthoSnap(from: Point, to: Point): Point {
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
    ? { x: to.x, y: from.y }
    : { x: from.x, y: to.y }
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// ============ Extrusión a 3D ============

export interface WallPiece {
  key: string
  /** Centro de la pieza en metros, con el origen en el centro del plano. */
  position: [number, number, number]
  /** Ancho, alto, espesor en metros. */
  size: [number, number, number]
  rotationY: number
  /** Los paños de vidrio se renderizan translúcidos. */
  glass: boolean
}

/** Centro del plano en píxeles: el 3D se arma alrededor del origen. */
function planCenter(model: PlanModel): Point {
  if (model.walls.length === 0) {
    return { x: model.imageWidth / 2, y: model.imageHeight / 2 }
  }
  const xs = model.walls.flatMap((w) => [w.a.x, w.b.x])
  const ys = model.walls.flatMap((w) => [w.a.y, w.b.y])
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/**
 * Convierte cada muro en cajas, abriendo huecos para puertas y ventanas.
 *
 * En lugar de restar volúmenes (CSG, caro y frágil), parte el muro en tramos
 * llenos y agrega el dintel arriba de cada abertura y el antepecho abajo de
 * cada ventana. Es exacto para muros rectos y no necesita librerías extra.
 */
export function buildWallPieces(model: PlanModel): WallPiece[] {
  if (!model.pxPerMeter) return []

  const scale = model.pxPerMeter
  const center = planCenter(model)
  const pieces: WallPiece[] = []

  for (const wall of model.walls) {
    const ax = (wall.a.x - center.x) / scale
    const az = (wall.a.y - center.y) / scale
    const bx = (wall.b.x - center.x) / scale
    const bz = (wall.b.y - center.y) / scale

    const length = Math.hypot(bx - ax, bz - az)
    if (length < 0.01) continue

    const dirX = (bx - ax) / length
    const dirZ = (bz - az) / length
    const rotationY = -Math.atan2(bz - az, bx - ax)

    const push = (
      from: number,
      to: number,
      yBottom: number,
      yTop: number,
      glass: boolean,
      tag: string
    ) => {
      const span = to - from
      const tall = yTop - yBottom
      if (span <= 0.005 || tall <= 0.005) return
      const mid = (from + to) / 2
      pieces.push({
        key: `${wall.id}_${tag}`,
        position: [ax + dirX * mid, (yBottom + yTop) / 2, az + dirZ * mid],
        size: [span, tall, glass ? 0.02 : wall.thickness],
        rotationY,
        glass,
      })
    }

    const openings = model.openings
      .filter((o) => o.wallId === wall.id)
      .map((o) => ({
        ...o,
        start: Math.max(0, o.offset - o.width / 2),
        end: Math.min(length, o.offset + o.width / 2),
      }))
      .filter((o) => o.end > o.start)
      .sort((a, b) => a.start - b.start)

    let cursor = 0
    openings.forEach((opening, i) => {
      // Tramo lleno antes de la abertura.
      push(cursor, opening.start, 0, wall.height, false, `solid${i}`)

      const head = Math.min(wall.height, opening.sill + opening.height)
      // Antepecho debajo de la ventana.
      push(opening.start, opening.end, 0, opening.sill, false, `sill${i}`)
      // Dintel encima.
      push(opening.start, opening.end, head, wall.height, false, `lintel${i}`)
      if (opening.kind === 'window') {
        push(opening.start, opening.end, opening.sill, head, true, `glass${i}`)
      }

      cursor = Math.max(cursor, opening.end)
    })

    push(cursor, length, 0, wall.height, false, 'solidEnd')
  }

  return pieces
}

export interface SlabSpec {
  position: [number, number, number]
  size: [number, number, number]
}

/** Losa bajo los muros, del tamaño de su bounding box más un margen. */
export function buildSlab(model: PlanModel): SlabSpec | null {
  if (!model.pxPerMeter || model.walls.length === 0) return null

  const scale = model.pxPerMeter
  const center = planCenter(model)
  const xs = model.walls.flatMap((w) => [w.a.x, w.b.x])
  const ys = model.walls.flatMap((w) => [w.a.y, w.b.y])

  const width = (Math.max(...xs) - Math.min(...xs)) / scale + 0.4
  const depth = (Math.max(...ys) - Math.min(...ys)) / scale + 0.4
  const cx = ((Math.min(...xs) + Math.max(...xs)) / 2 - center.x) / scale
  const cz = ((Math.min(...ys) + Math.max(...ys)) / 2 - center.y) / scale

  return { position: [cx, -0.06, cz], size: [width, 0.12, depth] }
}
