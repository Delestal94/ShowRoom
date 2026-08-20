import { ImageResponse } from 'next/og'
import { eq, and } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'
import { projects, units } from '@/server/db/schema'

export const runtime = 'nodejs'
export const alt = 'Proyecto en ShowRoom'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Imagen de previsualización del proyecto.
 *
 * Es lo que se ve al pegar el link en WhatsApp, que es por donde
 * efectivamente se comparte un proyecto en este mercado. Un preview con el
 * nombre, la dirección y el rango de precios convierte mucho mejor que la
 * tarjeta genérica con la URL pelada.
 */
export default async function OpengraphImage({
  params,
}: {
  params: { projectSlug: string }
}) {
  const project = await publicDb.query.projects.findFirst({
    where: eq(projects.slug, params.projectSlug),
    columns: { id: true, name: true, address: true, status: true },
    with: { tenant: { columns: { name: true } } },
  })

  const fallbackTitle = project?.name ?? 'ShowRoom'
  let subtitle = project?.address ?? ''
  let stat = ''

  if (project && project.status === 'published') {
    const available = await publicDb.query.units.findMany({
      where: and(eq(units.projectId, project.id), eq(units.status, 'available')),
      columns: { price: true, currency: true },
    })

    const prices = available
      .map((u) => Number(u.price))
      .filter((n) => Number.isFinite(n) && n > 0)

    if (prices.length > 0) {
      const min = Math.min(...prices)
      const currency = available[0]?.currency ?? 'USD'
      stat = `${available.length} unidades · desde ${currency} ${min.toLocaleString('es-AR')}`
    } else if (available.length > 0) {
      stat = `${available.length} unidades disponibles`
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0d0e14 0%, #16182280 60%, #1a1633 100%)',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 2.5 29 10v12L16 29.5 3 22V10L16 2.5Z"
              stroke="#7c5cff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M3 10l13 7.5L29 10M16 17.5v12"
              stroke="#7c5cff"
              strokeWidth="2"
              strokeLinejoin="round"
              opacity="0.7"
            />
          </svg>
          <span style={{ color: '#8b8fa3', fontSize: 24, letterSpacing: 1 }}>
            {project?.tenant?.name ?? 'ShowRoom'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#f5f6fa',
              fontSize: fallbackTitle.length > 28 ? 68 : 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {fallbackTitle}
          </div>
          {subtitle && (
            <div style={{ color: '#8b8fa3', fontSize: 30, marginTop: 18 }}>{subtitle}</div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#a78bfa', fontSize: 28, fontWeight: 600 }}>
            {stat || 'Recorrido 3D interactivo'}
          </div>
          <div
            style={{
              display: 'flex',
              color: '#0d0e14',
              background: '#7c5cff',
              fontSize: 24,
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: 999,
            }}
          >
            Ver el proyecto
          </div>
        </div>
      </div>
    ),
    size
  )
}
