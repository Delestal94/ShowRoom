import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { listProjects } from '@/modules/projects/project-service'
import { getLeadStats } from '@/modules/leads/lead-service'
import Link from 'next/link'

export default async function DashboardPage({
  params,
}: {
  params: { tenantSlug: string }
}) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (tenantSlug !== params.tenantSlug) {
    return <div>Invalid tenant</div>
  }

  const tenant = await getTenantFromSlug(params.tenantSlug)
  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const [projects, leadStats] = await Promise.all([
    listProjects(tenant.id),
    getLeadStats(tenant.id),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back to ShowRoom</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Units" value={projects.reduce((sum, p) => sum + (p.units?.length || 0), 0)} />
        <StatCard label="Tours" value={0} />
        <Link href={`/dashboard/${params.tenantSlug}/crm`}>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
            <p className="text-sm font-medium text-gray-600">Leads</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{leadStats.total}</p>
            {leadStats.new > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                {leadStats.new} new
              </p>
            )}
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <Link
            href={`/dashboard/${params.tenantSlug}/projects/new`}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No projects yet. Create one to get started!
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/${params.tenantSlug}/projects/${project.id}`}
                className="p-6 hover:bg-gray-50 transition block"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{project.address}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {project.units?.length || 0} units • {project.status}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  )
}
