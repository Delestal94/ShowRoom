import { db } from '@/server/db/client'
import { projects } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { listToursByProject } from '@/modules/tours/tour-service'
import { TourViewer } from '@/components/tour-viewer'

export default async function StorefrontPage({
  params,
}: {
  params: { projectSlug: string }
}) {
  // Find project by slug (across all tenants)
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.projectSlug),
    columns: {
      id: true,
      name: true,
      slug: true,
      address: true,
      tenantId: true,
      status: true,
      amenitiesJson: true,
    },
    with: {
      units: {
        columns: {
          id: true,
          code: true,
          floor: true,
          m2: true,
          price: true,
          status: true,
        },
      },
    },
  })

  if (!project || project.status !== 'published') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Project Not Found</h1>
          <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist or is not published yet.</p>
        </div>
      </div>
    )
  }

  // Fetch tours for this project
  const tours = await listToursByProject(project.tenantId, project.id)
  const readyTours = tours.filter(t => t.status === 'ready')

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-lg text-gray-600 mt-2">{project.address}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {readyTours.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No tours available yet for this project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 3D Viewer */}
            <div className="lg:col-span-2">
              <div style={{ aspectRatio: '16/9' }}>
                <TourViewer tours={readyTours as any} />
              </div>

            </div>

            {/* Unit Listing */}
            <aside>
              <div className="bg-gray-50 rounded-lg p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Units Available</h2>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {project.units && project.units.length > 0 ? (
                    project.units.map((unit) => (
                      <div
                        key={unit.id}
                        className="border border-gray-200 rounded p-3 hover:border-blue-300 hover:bg-blue-50 transition"
                      >
                        <p className="font-semibold text-gray-900">{unit.code}</p>
                        <div className="text-xs text-gray-500 mt-2 space-y-1">
                          {unit.floor && <p>Floor: {unit.floor}</p>}
                          {unit.m2 && <p>Size: {unit.m2} m&sup2;</p>}
                          {unit.price && <p>Price: ${unit.price}</p>}
                        </div>
                        <span className="inline-block mt-2 text-xs px-2 py-1 rounded font-medium bg-green-100 text-green-800">
                          {unit.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No units available</p>
                  )}
                </div>

                <button className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Contact Agent
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

