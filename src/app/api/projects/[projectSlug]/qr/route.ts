import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { eq } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'
import { projects } from '@/server/db/schema'
import { getSiteUrl } from '@/lib/site-url'

/**
 * PNG QR pointing at the project's public page — for print material and
 * on-site signage.
 *
 * Generated on demand rather than stored: the target URL is derived from the
 * slug, so a stored image would go stale the moment the slug changes.
 */
export async function GET(
  request: Request,
  { params }: { params: { projectSlug: string } }
) {
  const project = await publicDb.query.projects.findFirst({
    where: eq(projects.slug, params.projectSlug),
    columns: { slug: true, status: true },
  })

  if (!project || project.status !== 'published') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const requested = Number(url.searchParams.get('size') ?? 600)
  const size = Math.min(2000, Math.max(120, Number.isFinite(requested) ? requested : 600))

  const target = new URL(`/${project.slug}`, getSiteUrl()).toString()

  const png = await QRCode.toBuffer(target, {
    type: 'png',
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    // Dark on white: printed QRs need maximum contrast, and inverted codes
    // are unreliable with some scanners.
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  return new NextResponse(png as any, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Content-Disposition': `inline; filename="qr-${project.slug}.png"`,
    },
  })
}
