import { leads, leadActivities } from '@/server/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

export interface CreateLeadInput {
  tenantId: string
  projectId: string
  name: string
  email: string
  phone?: string | null
  source?: string
  brokerUserId?: string
}

export interface UpdateLeadInput {
  status?: 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
}

/**
 * Called from the public contact form, where there is no session and so no
 * tenant context. The `leads_insert` RLS policy allows anonymous inserts on
 * purpose — anyone can submit the form — while reading stays tenant-scoped.
 */
export async function createLead(input: CreateLeadInput) {
  const [lead] = await publicDb
    .insert(leads)
    .values({
      tenantId: input.tenantId,
      projectId: input.projectId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: input.source || 'website',
      status: 'new',
    })
    .returning()

  return lead
}

export async function getLead(tenantId: string, leadId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
      with: { project: { columns: { name: true, slug: true } } },
    })
  )
}

export async function listLeadsByProject(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.leads.findMany({
      where: and(eq(leads.tenantId, tenantId), eq(leads.projectId, projectId)),
      orderBy: desc(leads.createdAt),
    })
  )
}

export async function listLeadsByTenant(
  tenantId: string,
  filters?: { status?: string; projectId?: string }
) {
  const conditions = [eq(leads.tenantId, tenantId)]

  if (filters?.status) conditions.push(eq(leads.status, filters.status as any))
  if (filters?.projectId) conditions.push(eq(leads.projectId, filters.projectId))

  return withTenant(tenantId, (tx) =>
    tx.query.leads.findMany({
      where: and(...conditions),
      with: { project: { columns: { name: true, slug: true } } },
      orderBy: desc(leads.createdAt),
    })
  )
}

export async function updateLead(
  tenantId: string,
  leadId: string,
  input: UpdateLeadInput
) {
  return withTenant(tenantId, async (tx) => {
    const before = await tx.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
      columns: { status: true },
    })
    if (!before) return undefined

    const [updated] = await tx
      .update(leads)
      .set({ status: input.status, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .returning()

    // Logged in the same transaction as the change itself, so the timeline
    // can't end up disagreeing with the lead's actual status.
    if (updated && input.status && input.status !== before.status) {
      await tx.insert(leadActivities).values({
        leadId,
        type: 'status_change',
        payloadJson: { from: before.status, to: input.status },
      })
    }

    return updated
  })
}

export async function addLeadNote(tenantId: string, leadId: string, note: string) {
  return withTenant(tenantId, async (tx) => {
    // Scoped lookup first: a lead id from another tenant matches nothing, so
    // the note can never be attached across tenants.
    const lead = await tx.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
      columns: { id: true },
    })
    if (!lead) return undefined

    const [activity] = await tx
      .insert(leadActivities)
      .values({ leadId, type: 'note', payloadJson: { note } })
      .returning()
    return activity
  })
}

export async function addLeadActivity(
  tenantId: string,
  leadId: string,
  type: string,
  payload?: Record<string, any>
) {
  return withTenant(tenantId, async (tx) => {
    const [activity] = await tx
      .insert(leadActivities)
      .values({ leadId, type, payloadJson: payload })
      .returning()
    return activity
  })
}

export async function getLeadActivities(tenantId: string, leadId: string) {
  return withTenant(tenantId, async (tx) => {
    // The lead_activities policy joins through leads, so a lead belonging to
    // another tenant yields no rows regardless of the id passed in.
    const lead = await tx.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
      columns: { id: true },
    })
    if (!lead) return []

    return tx.query.leadActivities.findMany({
      where: eq(leadActivities.leadId, leadId),
      orderBy: desc(leadActivities.createdAt),
    })
  })
}

export async function getLeadStats(tenantId: string) {
  const allLeads = await listLeadsByTenant(tenantId)

  return {
    total: allLeads.length,
    new: allLeads.filter((l) => l.status === 'new').length,
    contacted: allLeads.filter((l) => l.status === 'contacted').length,
    qualified: allLeads.filter((l) => l.status === 'qualified').length,
    won: allLeads.filter((l) => l.status === 'won').length,
    lost: allLeads.filter((l) => l.status === 'lost').length,
  }
}
