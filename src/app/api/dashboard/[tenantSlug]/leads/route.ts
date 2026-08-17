import { listLeadsByTenant } from '@/modules/leads/lead-service'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'

export async function GET(
  request: Request,
  { params }: { params: { tenantSlug: string } }
) {
  try {
    const tenant = await getTenantFromSlug(params.tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const projectId = url.searchParams.get('projectId')

    const leads = await listLeadsByTenant(tenant.id, {
      status: status || undefined,
      projectId: projectId || undefined,
    })

    return Response.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return Response.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}
