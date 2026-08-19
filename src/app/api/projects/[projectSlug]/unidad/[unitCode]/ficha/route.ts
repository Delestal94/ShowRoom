import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { eq } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'
import { projects } from '@/server/db/schema'
import { getPublicUnitByCode } from '@/modules/units/unit-service'
import { getSiteUrl } from '@/lib/site-url'
import { UnitSheet } from '@/modules/pdf/unit-sheet'
import { checkRateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

// La generación del PDF necesita APIs de Node, no del runtime Edge.
export const runtime = 'nodejs'

/**
 * Ficha técnica en PDF de una unidad, con QR al recorrido.
 *
 * Pública y sin sesión: es material de venta que el broker manda por
 * WhatsApp o imprime. RLS se encarga de que sólo salgan unidades de
 * proyectos publicados.
 */
export async function GET(
  request: Request,
  { params }: { params: { projectSlug: string; unitCode: string } }
) {
  // Renderizar un PDF es caro en CPU y el endpoint es público: sin freno,
  // un bucle de requests agota la función.
  const limit = await checkRateLimit(clientKey(request, 'pdf'), 30, 3600)
  if (!limit.allowed) {
    return tooManyRequests('Demasiadas descargas. Probá en un rato.')
  }

  const unitCode = decodeURIComponent(params.unitCode)

  const project = await publicDb.query.projects.findFirst({
    where: eq(projects.slug, params.projectSlug),
    columns: { id: true, name: true, slug: true, address: true, status: true },
    with: { tenant: { columns: { name: true, contactWhatsapp: true } } },
  })

  if (!project || project.status !== 'published') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const unit = await getPublicUnitByCode(project.id, unitCode)
  if (!unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }

  const publicUrl = new URL(
    `/${project.slug}/unidad/${encodeURIComponent(unit.code)}`,
    getSiteUrl()
  ).toString()

  // El QR va embebido como data URI: @react-pdf no puede resolver una URL
  // relativa ni esperar una descarga externa al renderizar.
  const qrDataUri = await QRCode.toDataURL(publicUrl, {
    width: 400,
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  const buffer = await renderToBuffer(
    UnitSheet({
      data: {
        projectName: project.name,
        projectAddress: project.address,
        developerName: project.tenant?.name ?? '',
        unitCode: unit.code,
        floor: unit.floor,
        m2: unit.m2,
        price: unit.price,
        currency: unit.currency,
        bedrooms: unit.bedrooms,
        orientation: unit.orientation,
        status: unit.status,
        publicUrl,
        qrDataUri,
        contactWhatsapp: project.tenant?.contactWhatsapp ?? null,
      },
    })
  )

  const fileName = `${project.slug}-${unit.code}.pdf`.replace(/[^\w.-]/g, '-')

  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
