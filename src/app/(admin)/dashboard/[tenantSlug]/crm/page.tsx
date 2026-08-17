import { LeadsKanban } from '@/components/leads-kanban'
import { listLeadsByTenant, getLeadStats } from '@/modules/leads/lead-service'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'

export default async function CRMPage({
  params,
}: {
  params: { tenantSlug: string }
}) {
  const tenant = await getTenantFromSlug(params.tenantSlug)
  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const [leads, stats] = await Promise.all([
    listLeadsByTenant(tenant.id),
    getLeadStats(tenant.id),
  ])

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
        <p className="text-gray-600">Manage and track your sales pipeline</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-2">Total</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-2">New</p>
          <p className="text-3xl font-bold text-gray-900">{stats.new}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-2">Contacted</p>
          <p className="text-3xl font-bold text-gray-900">{stats.contacted}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-2">Qualified</p>
          <p className="text-3xl font-bold text-gray-900">{stats.qualified}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-2">Won</p>
          <p className="text-3xl font-bold text-gray-900">{stats.won}</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-white rounded-lg shadow p-6">
        <LeadsKanban leads={leads as any} />
      </div>
    </div>
  )
}
