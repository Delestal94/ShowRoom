import { NextResponse } from 'next/server'
import { db } from '@/server/db/client'
import { leads } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost']

export async function PATCH(
  request: Request,
  { params }: { params: { leadId: string } }
) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await request.json().catch(() => ({}))

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Scoping the WHERE by tenantId is what makes this tenant-safe: a lead ID
  // from another tenant simply won't match and falls through to 404.
  const [updated] = await db
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(leads.id, params.leadId), eq(leads.tenantId, tenant.tenantId)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, lead: updated })
}
