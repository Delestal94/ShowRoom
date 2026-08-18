import { NextResponse } from 'next/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { listLeadsByTenant } from '@/modules/leads/lead-service'

export async function GET(request: Request) {
  let tenant
  try {
    tenant = await requireCurrentTenant()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const projectId = url.searchParams.get('projectId')

  const leads = await listLeadsByTenant(tenant.tenantId, {
    status: status || undefined,
    projectId: projectId || undefined,
  })

  return NextResponse.json({ leads })
}
