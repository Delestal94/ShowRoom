import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { getBrokerReport } from '@/modules/brokers/broker-service'
import { getSiteUrl } from '@/lib/site-url'
import { NewBrokerLinkForm, BrokerLinkRow } from './brokers-client'

export const metadata: Metadata = { title: 'Brokers' }

export default async function BrokersPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const report = await getBrokerReport(tenant.tenantId, params.projectId)
  const base = getSiteUrl()

  const totals = report.reduce(
    (acc, r) => ({
      clicks: acc.clicks + r.clicks,
      leads: acc.leads + r.leads,
      won: acc.won + r.won,
    }),
    { clicks: 0, leads: 0, won: 0 }
  )

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-4">
        <h1 className="text-title font-semibold text-fg">Brokers</h1>
        <p className="mt-1 text-fg-muted">
          Un link por broker para saber quién trae cada consulta de {project.name}.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-surface/50 p-6">
        <h2 className="font-semibold text-fg">Nuevo link</h2>
        <p className="mt-1 text-sm text-fg-muted">
          No necesitan cuenta: les mandás el link y listo.
        </p>
        <div className="mt-4">
          <NewBrokerLinkForm projectId={params.projectId} />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-title font-semibold text-fg">Rendimiento</h2>
          {report.length > 0 && (
            <p className="text-sm text-fg-muted">
              {totals.clicks} aperturas · {totals.leads} consultas · {totals.won} cerradas
            </p>
          )}
        </div>

        {report.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-muted">
            Todavía no creaste ningún link de broker.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface/50">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-subtle">
                  <th className="p-3 font-medium">Broker</th>
                  <th className="p-3 font-medium">Código</th>
                  <th className="p-3 font-medium">Aperturas</th>
                  <th className="p-3 font-medium">Vistas</th>
                  <th className="p-3 font-medium">Consultas</th>
                  <th className="p-3 font-medium">Cerradas</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {report.map((row) => {
                  const url = new URL(
                    `/${project.slug}?ref=${row.trackingCode}`,
                    base
                  ).toString()

                  return (
                    <tr key={row.linkId} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium text-fg">
                        {row.brokerName ?? 'Sin nombre'}
                      </td>
                      <td className="p-3 font-mono text-xs text-fg-muted">
                        {row.trackingCode}
                      </td>
                      <td className="p-3 text-fg-muted">{row.clicks}</td>
                      <td className="p-3 text-fg-muted">{row.views}</td>
                      <td className="p-3 font-medium text-fg">{row.leads}</td>
                      <td className="p-3">
                        {row.won > 0 ? (
                          <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                            {row.won}
                          </span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end">
                          <BrokerLinkRow
                            projectId={params.projectId}
                            linkId={row.linkId}
                            url={url}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-fg-subtle">
          Las aperturas cuentan visitas al link, no personas únicas. La atribución dura 30 días
          desde que alguien entra por el link del broker.
        </p>
      </section>
    </div>
  )
}
