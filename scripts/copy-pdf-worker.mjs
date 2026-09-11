// Vendorea el worker de pdf.js como asset estático propio, para no
// depender de un CDN externo en runtime (ver la nota en
// src/components/plan3d/pdf-source.ts). Corre en cada `npm install` para
// no tener que commitear un archivo generado de más de 1MB.
import { copyFileSync, mkdirSync, existsSync } from 'fs'

const src = 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
const destDir = 'public'
const dest = `${destDir}/pdf.worker.min.mjs`

if (!existsSync(src)) {
  console.warn('[copy-pdf-worker] no se encontró pdfjs-dist, se omite')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log('[copy-pdf-worker] worker de pdf.js copiado a public/')
