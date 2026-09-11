'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { PlanEditor2D, type EditorMode } from './plan-editor-2d'
import { PlanViewer3D } from './plan-viewer-3d'
import { exportPlanToGlb } from './export-glb'
import { detectWalls } from './wall-detector'
import {
  boundingAreaM2,
  canPlaceOpening,
  contourAreaM2,
  createId,
  distance,
  emptyPlan,
  OPENING_PRESETS,
  totalWallLength,
  type OpeningKind,
  type PlanModel,
  type Point,
} from './plan-model'

const MAX_HISTORY = 50
/** Espera de inactividad antes de autoguardar, para no pegarle a la API en cada trazo. */
const AUTOSAVE_DEBOUNCE_MS = 2000

const TOOLS: { id: EditorMode; label: string; hint: string }[] = [
  { id: 'calibrate', label: 'Calibrar', hint: 'Marcá dos puntos sobre una medida conocida del plano.' },
  { id: 'draw', label: 'Trazar muros', hint: 'Click para empezar, click para cerrar cada tramo. Esc corta la cadena.' },
  { id: 'contour', label: 'Contorno', hint: 'Click en cada esquina del perímetro exterior, en orden. Define la losa real.' },
  { id: 'ignore', label: 'Zona a ignorar', hint: 'Click en una esquina y click en la opuesta. El detector automático ignora lo que quede adentro.' },
  { id: 'openings', label: 'Aberturas', hint: 'Click sobre un muro para colocar la abertura elegida.' },
  { id: 'erase', label: 'Borrar', hint: 'Click sobre un muro, una abertura o una zona para eliminarla.' },
]

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type PublishStatus = 'idle' | 'exporting' | 'uploading' | 'publishing' | 'published' | 'error'

/** Lo que persiste en `floor_plans.model_json` — todo el estado editable salvo la imagen, que vive en `sourceCdnUrl`. */
type PersistedModel = Pick<
  PlanModel,
  | 'walls'
  | 'openings'
  | 'exteriorContour'
  | 'ignoreZones'
  | 'defaultWallHeight'
  | 'defaultWallThickness'
  | 'imageWidth'
  | 'imageHeight'
>

interface PlanStudioProps {
  projectId: string
  projectName: string
  floorPlanId: string
  initialSourceUrl: string
  initialModelJson: Partial<PersistedModel> | null
  initialPxPerMeter: number | null
}

export function PlanStudio({
  projectId,
  projectName,
  floorPlanId,
  initialSourceUrl,
  initialModelJson,
  initialPxPerMeter,
}: PlanStudioProps) {
  const [model, setModel] = useState<PlanModel>(() => ({
    ...emptyPlan(),
    imageUrl: initialSourceUrl,
    pxPerMeter: initialPxPerMeter,
    walls: initialModelJson?.walls ?? [],
    openings: initialModelJson?.openings ?? [],
    exteriorContour: initialModelJson?.exteriorContour ?? [],
    ignoreZones: initialModelJson?.ignoreZones ?? [],
    defaultWallHeight: initialModelJson?.defaultWallHeight ?? 2.6,
    defaultWallThickness: initialModelJson?.defaultWallThickness ?? 0.15,
    imageWidth: initialModelJson?.imageWidth ?? 0,
    imageHeight: initialModelJson?.imageHeight ?? 0,
  }))
  const [imageReady, setImageReady] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [history, setHistory] = useState<PlanModel[]>([])
  const [redoStack, setRedoStack] = useState<PlanModel[]>([])
  const [mode, setMode] = useState<EditorMode>(initialPxPerMeter ? 'draw' : 'calibrate')
  const [ortho, setOrtho] = useState(true)
  const [openingKind, setOpeningKind] = useState<OpeningKind>('door')
  const [calibrationLine, setCalibrationLine] = useState<[Point, Point] | null>(null)
  const [realLength, setRealLength] = useState('3')
  const [pane, setPane] = useState<'2d' | '3d' | 'split'>('split')
  const [detecting, setDetecting] = useState(false)
  const [detection, setDetection] = useState({ threshold: 128, minLengthM: 0.8, maxThicknessM: 0.45 })
  const [notice, setNotice] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle')
  const imageRef = useRef<HTMLImageElement | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextSaveRef = useRef(true) // el primer render no es un cambio del usuario

  // Carga la imagen ya subida (Supabase la sirve con CORS abierto en un
  // bucket público) para que el detector pueda leer sus píxeles con canvas.
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setModel((prev) => ({
        ...prev,
        imageWidth: prev.imageWidth || img.naturalWidth,
        imageHeight: prev.imageHeight || img.naturalHeight,
      }))
      setImageReady(true)
    }
    img.onerror = () => setImageError(true)
    img.src = initialSourceUrl
  }, [initialSourceUrl])

  const update = useCallback((fn: (prev: PlanModel) => PlanModel) => {
    setModel((prev) => {
      setHistory((h) => [...h, prev].slice(-MAX_HISTORY))
      setRedoStack([]) // un cambio nuevo invalida cualquier rehacer pendiente
      skipNextSaveRef.current = false
      return fn(prev)
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      skipNextSaveRef.current = false
      setModel((current) => {
        setRedoStack((r) => [...r, current].slice(-MAX_HISTORY))
        return h[h.length - 1]
      })
      return h.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r
      skipNextSaveRef.current = false
      setModel((current) => {
        setHistory((h) => [...h, current].slice(-MAX_HISTORY))
        return r[r.length - 1]
      })
      return r.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // Autoguardado: espera una pausa de inactividad y guarda el modelo entero.
  // No hay parche parcial porque el editor siempre opera sobre la planta
  // completa (ver la nota de model_json en el schema).
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      const persisted: PersistedModel = {
        walls: model.walls,
        openings: model.openings,
        exteriorContour: model.exteriorContour,
        ignoreZones: model.ignoreZones,
        defaultWallHeight: model.defaultWallHeight,
        defaultWallThickness: model.defaultWallThickness,
        imageWidth: model.imageWidth,
        imageHeight: model.imageHeight,
      }
      try {
        const res = await fetch(
          `/api/dashboard/projects/${projectId}/floor-plans/${floorPlanId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelJson: persisted, pxPerMeter: model.pxPerMeter }),
          }
        )
        setSaveStatus(res.ok ? 'saved' : 'error')
      } catch {
        setSaveStatus('error')
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // model.imageUrl no participa del guardado (es sourceCdnUrl, fijo) — se
    // omite a propósito para no autoguardar por el efecto de carga de imagen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    model.walls,
    model.openings,
    model.exteriorContour,
    model.ignoreZones,
    model.defaultWallHeight,
    model.defaultWallThickness,
    model.pxPerMeter,
    projectId,
    floorPlanId,
  ])

  const applyCalibration = () => {
    const meters = Number(realLength.replace(',', '.'))
    if (!calibrationLine || !Number.isFinite(meters) || meters <= 0) {
      setNotice('Marcá una referencia sobre el plano e indicá cuánto mide en metros.')
      return
    }
    const px = distance(calibrationLine[0], calibrationLine[1])
    if (px < 5) {
      setNotice('La referencia es demasiado corta: cuanto más larga, menos error de escala.')
      return
    }
    update((prev) => ({ ...prev, pxPerMeter: px / meters }))
    setMode('draw')
    setNotice(null)
  }

  const runDetection = async () => {
    if (!imageRef.current || !model.pxPerMeter) return
    setDetecting(true)
    setNotice(null)
    // Cede el frame para que el spinner llegue a pintarse antes del trabajo
    // sincrónico de leer la imagen píxel por píxel.
    await new Promise((r) => setTimeout(r, 30))
    try {
      const found = detectWalls(imageRef.current, {
        pxPerMeter: model.pxPerMeter,
        threshold: detection.threshold,
        minLengthM: detection.minLengthM,
        maxThicknessM: detection.maxThicknessM,
        wallHeight: model.defaultWallHeight,
        ignoreZones: model.ignoreZones,
      })
      update((prev) => ({ ...prev, walls: found, openings: [] }))
      setNotice(
        found.length === 0
          ? 'No se detectó ningún muro. Probá subir el umbral o bajar el largo mínimo.'
          : `${found.length} muros detectados. Revisá el trazado: las cotas y los ejes también son líneas largas y finas.`
      )
    } catch {
      setNotice('Falló la detección sobre esta imagen. Trazá los muros a mano.')
    } finally {
      setDetecting(false)
    }
  }

  const addWall = (a: Point, b: Point) =>
    update((prev) => ({
      ...prev,
      walls: [
        ...prev.walls,
        {
          id: createId('wall'),
          a,
          b,
          thickness: prev.defaultWallThickness,
          height: prev.defaultWallHeight,
        },
      ],
    }))

  const deleteWall = (id: string) =>
    update((prev) => ({
      ...prev,
      walls: prev.walls.filter((w) => w.id !== id),
      openings: prev.openings.filter((o) => o.wallId !== id),
    }))

  const addOpening = (wallId: string, offset: number) => {
    const preset = OPENING_PRESETS[openingKind]
    const check = canPlaceOpening(model, wallId, offset, preset.width)
    if (!check.ok) {
      setNotice(check.reason)
      return
    }
    update((prev) => ({
      ...prev,
      openings: [
        ...prev.openings,
        {
          id: createId('op'),
          wallId,
          offset,
          width: preset.width,
          height: preset.height,
          sill: preset.sill,
          kind: openingKind,
        },
      ],
    }))
  }

  const deleteOpening = (id: string) =>
    update((prev) => ({ ...prev, openings: prev.openings.filter((o) => o.id !== id) }))

  const addContourPoint = (point: Point) =>
    update((prev) => ({ ...prev, exteriorContour: [...prev.exteriorContour, point] }))

  const clearContour = () => update((prev) => ({ ...prev, exteriorContour: [] }))

  const addIgnoreZone = (a: Point, b: Point) =>
    update((prev) => ({
      ...prev,
      ignoreZones: [...prev.ignoreZones, { id: createId('zone'), a, b }],
    }))

  const deleteIgnoreZone = (id: string) =>
    update((prev) => ({ ...prev, ignoreZones: prev.ignoreZones.filter((z) => z.id !== id) }))

  const applyDefaultsToAll = () =>
    update((prev) => ({
      ...prev,
      walls: prev.walls.map((w) => ({
        ...w,
        thickness: prev.defaultWallThickness,
        height: prev.defaultWallHeight,
      })),
    }))

  const downloadGlb = async () => {
    try {
      const blob = await exportPlanToGlb(model, projectName)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-planta.glb`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setNotice('No se pudo generar el GLB.')
    }
  }

  const publish = async () => {
    setNotice(null)
    setPublishStatus('exporting')
    try {
      const blob = await exportPlanToGlb(model, projectName)

      setPublishStatus('uploading')
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          tourKind: 'glb-model',
          fileName: `${floorPlanId}.glb`,
        }),
      })
      if (!presignRes.ok) throw new Error('presign')
      const { presignedUrl, storageKey, cdnUrl } = await presignRes.json()

      const putRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'model/gltf-binary' },
        body: blob,
      })
      if (!putRes.ok) throw new Error('upload')

      setPublishStatus('publishing')
      const publishRes = await fetch(
        `/api/dashboard/projects/${projectId}/floor-plans/${floorPlanId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageKey, cdnUrl }),
        }
      )
      if (!publishRes.ok) throw new Error('publish')

      setPublishStatus('published')
    } catch {
      setPublishStatus('error')
      setNotice('No se pudo publicar el modelo. Probá de nuevo en un momento.')
    }
  }

  const calibrated = model.pxPerMeter !== null
  const activeTool = TOOLS.find((t) => t.id === mode)

  if (imageError) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-fg">
        No se pudo cargar el plano original. Probá volver a subirlo desde el listado de plantas.
      </p>
    )
  }

  if (!imageReady) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-border bg-surface-2">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-3 text-sm text-fg-muted">Cargando el plano…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/50 p-2">
        {TOOLS.map((tool) => {
          const locked = tool.id !== 'calibrate' && !calibrated
          return (
            <button
              key={tool.id}
              type="button"
              disabled={locked}
              onClick={() => setMode(tool.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40',
                mode === tool.id
                  ? 'bg-primary text-primary-fg'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
              )}
            >
              {tool.label}
            </button>
          )
        })}

        <div className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          onClick={() => setOrtho((v) => !v)}
          aria-pressed={ortho}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm transition-colors',
            ortho ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg'
          )}
        >
          Ortogonal
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          className="rounded-full px-3 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
        >
          Deshacer
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={redoStack.length === 0}
          className="rounded-full px-3 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
        >
          Rehacer
        </button>

        <SaveIndicator status={saveStatus} />

        <div className="ml-auto flex gap-1 rounded-full bg-surface-2 p-1">
          {(['2d', 'split', '3d'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPane(p)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition-colors',
                pane === p ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
              )}
            >
              {p === '2d' ? 'Plano' : p === '3d' ? '3D' : 'Ambos'}
            </button>
          ))}
        </div>
      </div>

      {activeTool && (
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-fg">{activeTool.label}:</span> {activeTool.hint}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div
          className={cn(
            'grid h-[32rem] gap-3',
            pane === 'split' ? 'grid-rows-2 xl:grid-cols-2 xl:grid-rows-1' : 'grid-rows-1'
          )}
        >
          {pane !== '3d' && (
            <PlanEditor2D
              model={model}
              mode={mode}
              ortho={ortho}
              calibrationLine={calibrationLine}
              onCalibrationLine={setCalibrationLine}
              onAddWall={addWall}
              onDeleteWall={deleteWall}
              onAddOpening={addOpening}
              onDeleteOpening={deleteOpening}
              onAddContourPoint={addContourPoint}
              onAddIgnoreZone={addIgnoreZone}
              onDeleteIgnoreZone={deleteIgnoreZone}
            />
          )}
          {pane !== '2d' && <PlanViewer3D model={model} />}
        </div>

        <aside className="space-y-4">
          <Panel title="Escala">
            {calibrated ? (
              <div className="space-y-2">
                <Metric label="Escala" value={`${model.pxPerMeter!.toFixed(1)} px/m`} />
                <button
                  type="button"
                  onClick={() => {
                    setMode('calibrate')
                    setCalibrationLine(null)
                  }}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Recalibrar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-fg-muted">
                  Marcá sobre el plano una distancia que conozcas —una cota, el lado de un
                  ambiente— y escribí cuánto mide.
                </p>
                <label className="block">
                  <span className="text-xs text-fg-muted">Medida real (metros)</span>
                  <input
                    value={realLength}
                    onChange={(e) => setRealLength(e.target.value)}
                    inputMode="decimal"
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-border-strong"
                  />
                </label>
                <Button size="sm" onClick={applyCalibration} disabled={!calibrationLine}>
                  Aplicar escala
                </Button>
              </div>
            )}
          </Panel>

          {calibrated && (
            <>
              <Panel title="Detección automática">
                <div className="space-y-3">
                  <Slider
                    label="Umbral de tinta"
                    value={detection.threshold}
                    min={40}
                    max={220}
                    step={5}
                    onChange={(v) => setDetection((d) => ({ ...d, threshold: v }))}
                  />
                  <Slider
                    label="Largo mínimo (m)"
                    value={detection.minLengthM}
                    min={0.3}
                    max={4}
                    step={0.1}
                    onChange={(v) => setDetection((d) => ({ ...d, minLengthM: v }))}
                  />
                  <Slider
                    label="Espesor máximo (m)"
                    value={detection.maxThicknessM}
                    min={0.05}
                    max={1}
                    step={0.05}
                    onChange={(v) => setDetection((d) => ({ ...d, maxThicknessM: v }))}
                  />
                  <Button size="sm" variant="secondary" onClick={runDetection} disabled={detecting}>
                    {detecting ? 'Detectando…' : 'Detectar muros'}
                  </Button>
                  <p className="text-xs text-fg-subtle">
                    Encuentra muros de mancha sólida y de doble línea (CAD-a-imagen), sólo
                    horizontales y verticales. Reemplaza el trazado actual.
                  </p>
                </div>
              </Panel>

              <Panel title="Muros">
                <div className="space-y-3">
                  <Metric label="Trazados" value={String(model.walls.length)} />
                  <Metric label="Metros lineales" value={`${totalWallLength(model).toFixed(1)} m`} />
                  <Metric label="Superficie envolvente" value={`${boundingAreaM2(model).toFixed(1)} m²`} />

                  <NumberField
                    label="Altura por defecto (m)"
                    value={model.defaultWallHeight}
                    step={0.1}
                    onChange={(v) => update((p) => ({ ...p, defaultWallHeight: v }))}
                  />
                  <NumberField
                    label="Espesor por defecto (m)"
                    value={model.defaultWallThickness}
                    step={0.05}
                    onChange={(v) => update((p) => ({ ...p, defaultWallThickness: v }))}
                  />
                  <button
                    type="button"
                    onClick={applyDefaultsToAll}
                    disabled={model.walls.length === 0}
                    className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-40"
                  >
                    Aplicar a todos los muros
                  </button>
                </div>
              </Panel>

              <Panel title="Contorno exterior">
                <div className="space-y-3">
                  <p className="text-xs text-fg-muted">
                    Define la losa real (RF-63): sin esto, el piso queda al rectángulo que
                    contiene los muros, y en una planta en L o con retiros sobra piso en el aire.
                  </p>
                  <Metric label="Puntos" value={String(model.exteriorContour.length)} />
                  {model.exteriorContour.length >= 3 && (
                    <Metric label="Superficie del contorno" value={`${contourAreaM2(model).toFixed(1)} m²`} />
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('contour')}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      Trazar contorno
                    </button>
                    <button
                      type="button"
                      onClick={clearContour}
                      disabled={model.exteriorContour.length === 0}
                      className="text-sm text-danger underline-offset-4 hover:underline disabled:opacity-40"
                    >
                      Borrar contorno
                    </button>
                  </div>
                </div>
              </Panel>

              <Panel title="Zonas a ignorar">
                <div className="space-y-3">
                  <p className="text-xs text-fg-muted">
                    Escalera, cajetín, mobiliario: cualquier línea recta y fina que no sea un
                    muro. El detector automático descarta todo lo que quede adentro (RF-54).
                  </p>
                  <Metric label="Zonas marcadas" value={String(model.ignoreZones.length)} />
                  <button
                    type="button"
                    onClick={() => setMode('ignore')}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Marcar zona
                  </button>
                </div>
              </Panel>

              <Panel title="Aberturas">
                <div className="space-y-3">
                  <div className="flex gap-1 rounded-full bg-surface-2 p-1">
                    {(Object.keys(OPENING_PRESETS) as OpeningKind[]).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => {
                          setOpeningKind(kind)
                          setMode('openings')
                        }}
                        className={cn(
                          'flex-1 rounded-full px-3 py-1.5 text-xs transition-colors',
                          openingKind === kind
                            ? 'bg-primary text-primary-fg'
                            : 'text-fg-muted hover:text-fg'
                        )}
                      >
                        {OPENING_PRESETS[kind].label}
                      </button>
                    ))}
                  </div>
                  <Metric label="Colocadas" value={String(model.openings.length)} />
                </div>
              </Panel>

              <Panel title="Publicación">
                <div className="space-y-3">
                  <Button
                    size="sm"
                    onClick={publish}
                    disabled={model.walls.length === 0 || publishStatus === 'exporting' || publishStatus === 'uploading' || publishStatus === 'publishing'}
                    className="w-full"
                  >
                    {publishLabel(publishStatus)}
                  </Button>
                  <button
                    type="button"
                    onClick={downloadGlb}
                    disabled={model.walls.length === 0}
                    className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-40"
                  >
                    Descargar GLB
                  </button>
                  <p className="text-xs text-fg-subtle">
                    Publicar sube el modelo como tour del proyecto: queda disponible en el visor
                    público apenas el proyecto esté publicado.
                  </p>
                </div>
              </Panel>
            </>
          )}
        </aside>
      </div>

      {notice && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-fg">
          {notice}
        </p>
      )}

      <p className="text-xs text-fg-subtle">
        Rueda del mouse para zoom, botón del medio para desplazar, Ctrl+Z para deshacer. El
        trazado se guarda solo.
      </p>
    </div>
  )
}

function publishLabel(status: PublishStatus): string {
  switch (status) {
    case 'exporting':
      return 'Generando GLB…'
    case 'uploading':
      return 'Subiendo…'
    case 'publishing':
      return 'Publicando…'
    case 'published':
      return 'Publicado ✓'
    case 'error':
      return 'Reintentar publicación'
    default:
      return 'Publicar'
  }
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const label =
    status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Guardado' : 'No se pudo guardar'
  return (
    <span
      className={cn(
        'text-xs',
        status === 'error' ? 'text-danger' : status === 'saving' ? 'text-fg-muted' : 'text-fg-subtle'
      )}
    >
      {label}
    </span>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface/50 p-4">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="font-mono text-sm text-fg">{value}</span>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs text-fg-muted">
        {label}
        <span className="font-mono text-fg">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[oklch(var(--primary))]"
      />
    </label>
  )
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="text-xs text-fg-muted">{label}</span>
      <input
        type="number"
        step={step}
        min={0.02}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isFinite(next) && next > 0) onChange(next)
        }}
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-border-strong"
      />
    </label>
  )
}
