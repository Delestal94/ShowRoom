import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { getProject } from '@/modules/projects/project-service'
import { listToursByProject } from '@/modules/tours/tour-service'
import Link from 'next/link'

export default async function ProjectDetailPage({
  params,
}: {
  params: { tenantSlug: string; projectId: string }
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

  const project = await getProject(tenant.id, params.projectId)
  if (!project) {
    return <div>Project not found</div>
  }

  const tours = await listToursByProject(tenant.id, params.projectId)

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/dashboard/${params.tenantSlug}/projects`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
        >
          ← Back to Projects
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-2">{project.address}</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
            {project.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Units" value={project.units?.length || 0} />
        <StatCard label="Available" value={project.units?.filter(u => u.status === 'available').length || 0} />
        <StatCard label="Tours Uploaded" value={tours.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Units Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Units</h2>
            <Link
              href={`/dashboard/${params.tenantSlug}/projects/${params.projectId}/units/new`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              + Add Unit
            </Link>
          </div>

          {!project.units || project.units.length === 0 ? (
            <p className="text-sm text-gray-500">No units yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {project.units.map((unit) => (
                <Link
                  key={unit.id}
                  href={`/dashboard/${params.tenantSlug}/projects/${params.projectId}/units/${unit.id}`}
                  className="block p-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{unit.code}</span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {unit.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tours Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tours</h2>
            <Link
              href={`/dashboard/${params.tenantSlug}/projects/${params.projectId}/tours/new`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              + Upload Tour
            </Link>
          </div>

          {tours.length === 0 ? (
            <p className="text-sm text-gray-500">No tours uploaded yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className="p-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{tour.kind}</span>
                      <p className="text-xs text-gray-500 mt-1">{tour.storageKey}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      tour.status === 'ready'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tour.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Public Link */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Storefront Link</h3>
        <p className="text-sm text-gray-600 mb-4">
          Share this link with buyers to view your project:
        </p>
        <div className="bg-white p-4 rounded border border-gray-200 font-mono text-sm text-gray-900 break-all">
          {`${process.env.NEXT_PUBLIC_APP_URL}/${params.tenantSlug}/projects/${project.slug}`}
        </div>
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
