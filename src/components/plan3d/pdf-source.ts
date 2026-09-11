/**
 * Rasteriza una página de PDF a un canvas, para que el resto del pipeline
 * (calibración, detector, editor) siga trabajando sobre píxeles de imagen
 * como con cualquier PNG/JPG — nunca lee el contenido vectorial del PDF.
 *
 * Corre enteramente en el navegador: el PDF nunca se sube tal cual, sólo la
 * página ya convertida a imagen.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist'

/** ~158 dpi (72 dpi base del PDF × este factor) — por encima del piso de RF-02. */
const RASTER_SCALE = 2.2

let pdfjsPromise: ReturnType<typeof loadPdfjs> | null = null

async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist')
  // pdf.js v6 exige un worker ESM. El `new URL(..., import.meta.url)` que
  // recomienda pdf.js para bundlers falla bajo el webpack de Next 14: el
  // worker sale empaquetado como script clásico y `import.meta` revienta en
  // build. Se vendorea el .mjs tal cual en /public (ver scripts/postinstall
  // o copiarlo a mano tras `npm install`) para no depender de un CDN en
  // runtime — el mismo criterio que ya se aplicó para sacar el HDR externo
  // del visor 3D.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  return pdfjsLib
}

function getPdfjs() {
  if (!pdfjsPromise) pdfjsPromise = loadPdfjs()
  return pdfjsPromise
}

export interface LoadedPdf {
  numPages: number
  doc: PDFDocumentProxy
}

export async function loadPdf(file: File): Promise<LoadedPdf> {
  const pdfjsLib = await getPdfjs()
  const buffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise
  return { numPages: doc.numPages, doc }
}

/**
 * Renderiza una página a un canvas nuevo. `signal` permite cortar un render
 * en curso si el usuario cambia de página antes de que termine.
 */
export async function renderPdfPage(
  loaded: LoadedPdf,
  pageNumber: number,
  signal?: AbortSignal
): Promise<HTMLCanvasElement> {
  const page = await loaded.doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: RASTER_SCALE })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar el canvas de render')

  const task = page.render({ canvas, canvasContext: ctx, viewport })
  signal?.addEventListener('abort', () => task.cancel())
  await task.promise
  return canvas
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('No se pudo generar la imagen'))
    }, 'image/png')
  })
}
