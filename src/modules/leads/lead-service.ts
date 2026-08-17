import { db } from '@/server/db/client'
import { leads, leadActivities } from '@/server/db/schema'
import { eq, and, desc } from 'drizzle-orm'

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

export async function createLead(input: CreateLeadInput) {
  const [lead] = await db
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

export async function getLead(
  tenantId: string,
  leadId: string
) {
  return db.query.leads.findFirst({
    where: and(
      eq(leads.id, leadId),
      eq(leads.tenantId, tenantId)
    ),
    with: {
      project: {
        columns: { name: true, slug: true },
      },
    },
  })
}

export async function listLeadsByProject(
  tenantId: string,
  projectId: string
) {
  return db.query.leads.findMany({
    where: and(
      eq(leads.tenantId, tenantId),
      eq(leads.projectId, projectId)
    ),
    orderBy: desc(leads.createdAt),
  })
}

export async function listLeadsByTenant(
  tenantId: string,
  filters?: { status?: string; projectId?: string }
) {
  const conditions = [eq(leads.tenantId, tenantId)]

  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as any))
  }
  if (filters?.projectId) {
    conditions.push(eq(leads.projectId, filters.projectId))
  }

  return db.query.leads.findMany({
    where: and(...conditions),
    with: {
      project: {
        columns: { name: true, slug: true },
      },
    },
    orderBy: desc(leads.createdAt),
  })
}

export async function updateLead(
  tenantId: string,
  leadId: string,
  input: UpdateLeadInput
) {
  const [updated] = await db
    .update(leads)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.tenantId, tenantId)
      )
    )
    .returning()

  return updated
}

export async function addLeadActivity(
  leadId: string,
  type: string,
  payload?: Record<string, any>
) {
  const [activity] = await db
    .insert(leadActivities)
    .values({
      leadId,
      type,
      payloadJson: payload,
    })
    .returning()

  return activity
}

export async function getLeadActivities(
  tenantId: string,
  leadId: string
) {
  // Verify lead belongs to tenant
  const lead = await getLead(tenantId, leadId)
  if (!lead) return []

  return db.query.leadActivities.findMany({
    where: eq(leadActivities.leadId, leadId),
    orderBy: desc(leadActivities.createdAt),
  })
}

export async function getLeadStats(tenantId: string) {
  const allLeads = await listLeadsByTenant(tenantId)

  const stats = {
    total: allLeads.length,
    new: allLeads.filter((l) => l.status === 'new').length,
    contacted: allLeads.filter((l) => l.status === 'contacted').length,
    qualified: allLeads.filter((l) => l.status === 'qualified').length,
    won: allLeads.filter((l) => l.status === 'won').length,
    lost: allLeads.filter((l) => l.status === 'lost').length,
  }

  return stats
}
