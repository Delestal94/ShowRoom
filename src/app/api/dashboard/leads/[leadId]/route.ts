import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { updateLead } from '@/modules/leads/lead-service'

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const

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

  // updateLead scopes by tenantId and runs under RLS, so a lead id from
  // another tenant matches nothing and falls through to 404.
  const updated = await updateLead(tenant.tenantId, params.leadId, { status })

  if (!updated) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, lead: updated })
}
