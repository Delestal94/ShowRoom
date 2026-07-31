import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { listProjects } from '@/modules/projects/project-service'
import Link from 'next/link'

export default async function ProjectsPage({
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

  const projects = await listProjects(tenant.id)

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">Manage all your real estate projects</p>
        </div>
        <Link
          href={`/dashboard/${params.tenantSlug}/projects/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">Create your first project to start adding units and tours.</p>
          <Link
            href={`/dashboard/${params.tenantSlug}/projects/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/${params.tenantSlug}/projects/${project.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.address}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                  {project.status}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{project.units?.length || 0} units</span>
                  <span className="text-xs text-gray-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
