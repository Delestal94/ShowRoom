import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { listProjects } from '@/modules/projects/project-service'
import { getEventStats, getUnitPopularity, getHeatmapData } from '@/modules/analytics/analytics-service'

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: { tenantSlug: string }
  searchParams: { projectId?: string }
}) {
  const tenant = await getTenantFromSlug(params.tenantSlug)
  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const projects = await listProjects(tenant.id)
  const selectedProjectId = searchParams.projectId || projects[0]?.id

  let stats: any = null
  let unitPopularity: any[] = []
  let heatmapData: Record<string, any> = {}

  if (selectedProjectId) {
    const [s, up, hm] = await Promise.all([
      getEventStats(tenant.id, selectedProjectId, 7),
      getUnitPopularity(tenant.id, selectedProjectId, 7),
      getHeatmapData(tenant.id, selectedProjectId, 7),
    ])

    stats = s
    unitPopularity = up
    heatmapData = hm
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600">Track engagement and performance by project</p>
      </div>

      {/* Project Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <select
          defaultValue={selectedProjectId || ''}
          onChange={(e) => {
            if (e.target.value) {
              window.location.href = `/dashboard/${params.tenantSlug}/analytics?projectId=${e.target.value}`
            }
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm mb-2">Total Events</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalEvents || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm mb-2">Unique Sessions</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalSessions || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm mb-2">Avg Events/Session</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalSessions
                  ? (stats.totalEvents / stats.totalSessions).toFixed(1)
                  : '0'}
              </p>
            </div>
          </div>

          {/* Most Viewed Units */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Most Viewed Units
            </h2>

            {unitPopularity.length > 0 ? (
              <div className="space-y-2">
                {unitPopularity.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-900 font-medium">
                      Unit {item.unitId || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(item.views / (unitPopularity[0]?.views || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-gray-600 text-sm w-12 text-right">
                        {item.views} views
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No analytics data yet</p>
            )}
          </div>

          {/* Heatmap Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Unit Engagement Heatmap
            </h2>

            {Object.keys(heatmapData).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(heatmapData).map(([unitId, data]: [string, any]) => (
                  <div key={unitId} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">Unit {unitId}</span>
                      <span className="text-xs text-gray-600">
                        {data.engagements > 0 && `${data.engagements} conversions`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Views</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {data.views}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Dwell Time</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {(data.dwell_time_ms / (data.views || 1) / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Engagements</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {data.engagements}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No engagement data yet</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
