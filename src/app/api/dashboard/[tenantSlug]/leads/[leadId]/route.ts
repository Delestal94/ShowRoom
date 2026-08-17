import { db } from '@/server/db/client'
import { leads } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { tenantSlug: string; leadId: string }
  }
) {
  try {
    const tenant = await getTenantFromSlug(params.tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['new', 'contacted', 'qualified', 'won', 'lost'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }

    const [updated] = await db
      .update(leads)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leads.id, params.leadId),
          eq(leads.tenantId, tenant.id)
        )
      )
      .returning()

    if (!updated) {
      return Response.json({ error: 'Lead not found' }, { status: 404 })
    }

    return Response.json({ success: true, lead: updated })
  } catch (error) {
    console.error('Error updating lead:', error)
    return Response.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}
