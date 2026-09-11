import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { updateLead } from '@/modules/leads/lead-service'
import { canManageCrm } from '@/modules/tenancy/permissions'

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
  if (!canManageCrm(tenant.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status } = await request.json().catch(() => ({}))

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    // updateLead scopes by tenantId and runs under RLS, so a lead id from
    // another tenant matches nothing and falls through to 404.
    const updated = await updateLead(tenant.tenantId, params.leadId, { status })

    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, lead: updated })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
