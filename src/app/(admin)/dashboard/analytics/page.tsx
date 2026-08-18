import type { Metadata } from 'next'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { listProjects } from '@/modules/projects/project-service'
import { getEventStats, getUnitPopularity, getHeatmapData } from '@/modules/analytics/analytics-service'
import { getTenantBrokerReport } from '@/modules/brokers/broker-service'
import { StatCard } from '@/components/dashboard/stat-card'
import { ProjectSelect } from './project-select'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { projectId?: string }
}) {
  const tenant = await requireCurrentTenant()
  const [projects, brokerReport] = await Promise.all([
    listProjects(tenant.tenantId),
    getTenantBrokerReport(tenant.tenantId),
  ])
  const selectedProjectId = searchParams.projectId || projects[0]?.id

  let stats: Awaited<ReturnType<typeof getEventStats>> | null = null
  let unitPopularity: Awaited<ReturnType<typeof getUnitPopularity>> = []
  let heatmapData: Awaited<ReturnType<typeof getHeatmapData>> = {}

  if (selectedProjectId) {
    ;[stats, unitPopularity, heatmapData] = await Promise.all([
      getEventStats(tenant.tenantId, selectedProjectId, 7),
      getUnitPopularity(tenant.tenantId, selectedProjectId, 7),
      getHeatmapData(tenant.tenantId, selectedProjectId, 7),
    ])
  }

  const maxViews = unitPopularity[0]?.views || 1

  return (
    <div>
      <h1 className="text-title font-semibold text-fg">Analytics</h1>
      <p className="mt-1 text-fg-muted">Seguimiento de engagement y performance por proyecto</p>

      <div className="mt-6">
        <ProjectSelect
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          selectedId={selectedProjectId}
        />
      </div>

      {!selectedProjectId && (
        <p className="mt-8 text-sm text-fg-muted">Creá un proyecto para ver sus métricas.</p>
      )}

      {stats && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Eventos totales (7 días)" value={stats.totalEvents} />
            <StatCard label="Sesiones únicas" value={stats.totalSessions} />
            <StatCard
              label="Eventos / sesión"
              value={stats.totalSessions ? (stats.totalEvents / stats.totalSessions).toFixed(1) : '0'}
            />
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-surface/50 p-6">
            <h2 className="font-semibold text-fg">Unidades más vistas</h2>
            {unitPopularity.length > 0 ? (
              <div className="mt-4 space-y-3">
                {unitPopularity.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <span className="w-24 shrink-0 truncate text-sm font-medium text-fg">
                      {item.unitId || 'Sin ID'}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(item.views / maxViews) * 100}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm text-fg-muted">
                      {item.views} vistas
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 py-6 text-center text-sm text-fg-subtle">Todavía no hay datos</p>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-surface/50 p-6">
            <h2 className="font-semibold text-fg">Engagement por unidad</h2>
            {Object.keys(heatmapData).length > 0 ? (
              <div className="mt-4 space-y-3">
                {Object.entries(heatmapData).map(([unitId, data]) => (
                  <div key={unitId} className="rounded-md border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-fg">{unitId}</span>
                      {data.engagements > 0 && (
                        <span className="text-xs text-fg-subtle">
                          {data.engagements} conversiones
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-fg-subtle">Vistas</p>
                        <p className="font-semibold text-fg">{data.views}</p>
                      </div>
                      <div>
                        <p className="text-fg-subtle">Tiempo prom.</p>
                        <p className="font-semibold text-fg">
                          {(data.dwell_time_ms / (data.views || 1) / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div>
                        <p className="text-fg-subtle">Conversiones</p>
                        <p className="font-semibold text-fg">{data.engagements}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 py-6 text-center text-sm text-fg-subtle">Todavía no hay datos</p>
            )}
          </section>
        </>
      )}

      {brokerReport.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="font-semibold text-fg">Brokers</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Consolidado de todos tus proyectos, agrupado por broker.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-subtle">
                  <th className="p-3 font-medium">Broker</th>
                  <th className="p-3 font-medium">Proyectos</th>
                  <th className="p-3 font-medium">Aperturas</th>
                  <th className="p-3 font-medium">Consultas</th>
                  <th className="p-3 font-medium">Cerradas</th>
                  <th className="p-3 font-medium">Conversión</th>
                </tr>
              </thead>
              <tbody>
                {brokerReport.map((row) => (
                  <tr key={row.brokerName} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium text-fg">{row.brokerName}</td>
                    <td className="p-3 text-fg-muted">{row.projects}</td>
                    <td className="p-3 text-fg-muted">{row.clicks}</td>
                    <td className="p-3 font-medium text-fg">{row.leads}</td>
                    <td className="p-3 text-fg-muted">{row.won}</td>
                    <td className="p-3 text-fg-muted">
                      {row.leads > 0
                        ? `${Math.round((row.won / row.leads) * 100)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
