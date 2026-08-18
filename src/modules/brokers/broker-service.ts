import { randomBytes } from 'node:crypto'
import { brokerLinks, leads, analyticsEvents } from '@/server/db/schema'
import { eq, and, sql, count } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

/** Código corto, legible y sin caracteres ambiguos (0/O, 1/I/l). */
function generateCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join('')
}

export async function listBrokerLinks(tenantId: string, projectId: string) {
  return withTenant(tenantId, async (tx) => {
    const links = await tx.query.brokerLinks.findMany({
      where: and(
        eq(brokerLinks.tenantId, tenantId),
        eq(brokerLinks.projectId, projectId)
      ),
      orderBy: (l, { desc }) => [desc(l.createdAt)],
    })

    // Conteo de leads por link, en una sola consulta.
    const leadCounts = await tx
      .select({
        brokerLinkId: leads.brokerLinkId,
        total: count(),
        won: sql<number>`count(*) filter (where ${leads.status} = 'won')`,
      })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.projectId, projectId)))
      .groupBy(leads.brokerLinkId)

    const byLink = new Map(
      leadCounts.map((r) => [
        r.brokerLinkId,
        { total: Number(r.total), won: Number(r.won) },
      ])
    )

    return links.map((link) => ({
      ...link,
      leadCount: byLink.get(link.id)?.total ?? 0,
      wonCount: byLink.get(link.id)?.won ?? 0,
    }))
  })
}

export async function createBrokerLink(
  tenantId: string,
  projectId: string,
  brokerName: string
) {
  // El código es único a nivel global; reintentar ante colisión es más simple
  // y más correcto que consultar antes (RLS oculta los códigos ajenos, así
  // que un chequeo previo daría un falso "libre").
  for (let attempt = 0; attempt < 5; attempt++) {
    const trackingCode = generateCode()
    try {
      return await withTenant(tenantId, async (tx) => {
        const [row] = await tx
          .insert(brokerLinks)
          .values({ tenantId, projectId, brokerName, trackingCode })
          .returning()
        return row
      })
    } catch (error: any) {
      if (error?.code !== '23505') throw error
    }
  }
  throw new Error('No se pudo generar un código único')
}

export async function deleteBrokerLink(tenantId: string, linkId: string) {
  return withTenant(tenantId, (tx) =>
    tx
      .delete(brokerLinks)
      .where(and(eq(brokerLinks.id, linkId), eq(brokerLinks.tenantId, tenantId)))
  )
}

/** Resolución pública del código que viene en ?ref= — corre sin sesión. */
export async function resolveTrackingCode(code: string) {
  return publicDb.query.brokerLinks.findFirst({
    where: eq(brokerLinks.trackingCode, code),
    columns: { id: true, tenantId: true, projectId: true, brokerName: true },
  })
}

export async function registerClick(linkId: string) {
  // Contador aproximado: no distingue visitantes únicos, sólo aperturas.
  await publicDb
    .update(brokerLinks)
    .set({ clicks: sql`${brokerLinks.clicks} + 1` })
    .where(eq(brokerLinks.id, linkId))
}

export interface BrokerReportRow {
  linkId: string
  brokerName: string | null
  trackingCode: string
  clicks: number
  leads: number
  won: number
  views: number
}

/** Rendimiento por broker: aperturas, vistas, leads y cierres. */
export async function getBrokerReport(
  tenantId: string,
  projectId: string
): Promise<BrokerReportRow[]> {
  return withTenant(tenantId, async (tx) => {
    const links = await tx.query.brokerLinks.findMany({
      where: and(
        eq(brokerLinks.tenantId, tenantId),
        eq(brokerLinks.projectId, projectId)
      ),
    })
    if (links.length === 0) return []

    const leadRows = await tx
      .select({
        brokerLinkId: leads.brokerLinkId,
        total: count(),
        won: sql<number>`count(*) filter (where ${leads.status} = 'won')`,
      })
      .from(leads)
      .where(eq(leads.tenantId, tenantId))
      .groupBy(leads.brokerLinkId)

    const viewRows = await tx
      .select({
        brokerLinkId: analyticsEvents.brokerLinkId,
        total: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.tenantId, tenantId),
          eq(analyticsEvents.projectId, projectId)
        )
      )
      .groupBy(analyticsEvents.brokerLinkId)

    const leadMap = new Map(
      leadRows.map((r) => [r.brokerLinkId, { total: Number(r.total), won: Number(r.won) }])
    )
    const viewMap = new Map(viewRows.map((r) => [r.brokerLinkId, Number(r.total)]))

    return links
      .map((link) => ({
        linkId: link.id,
        brokerName: link.brokerName,
        trackingCode: link.trackingCode,
        clicks: link.clicks,
        leads: leadMap.get(link.id)?.total ?? 0,
        won: leadMap.get(link.id)?.won ?? 0,
        views: viewMap.get(link.id) ?? 0,
      }))
      .sort((a, b) => b.leads - a.leads || b.clicks - a.clicks)
  })
}
