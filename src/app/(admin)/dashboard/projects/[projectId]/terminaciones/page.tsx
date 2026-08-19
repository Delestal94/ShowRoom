import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { listFinishes, groupByCategory } from '@/modules/finishes/finish-service'
import { NewFinishForm, DeleteFinishButton } from './finishes-client'

export const metadata: Metadata = { title: 'Terminaciones' }

export default async function TerminacionesPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const finishes = await listFinishes(tenant.tenantId, params.projectId)
  const groups = groupByCategory(finishes as { category: string }[]) as {
    category: string
    options: typeof finishes
  }[]

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-4">
        <h1 className="text-title font-semibold text-fg">Terminaciones</h1>
        <p className="mt-1 text-fg-muted">
          Las opciones entre las que puede elegir el comprador. Se muestran como comparador en
          la página pública.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-surface/50 p-6">
        <h2 className="font-semibold text-fg">Nueva opción</h2>
        <div className="mt-5">
          <NewFinishForm projectId={params.projectId} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-title font-semibold text-fg">Cargadas</h2>

        {groups.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-muted">
            Todavía no cargaste terminaciones.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            {groups.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-medium uppercase tracking-wider text-fg-subtle">
                  {group.category}
                </h3>
                <div className="mt-3 space-y-2">
                  {group.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {option.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={option.imageUrl}
                            alt=""
                            className="h-12 w-16 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="h-12 w-16 shrink-0 rounded bg-surface-2" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{option.name}</p>
                          {option.description && (
                            <p className="truncate text-xs text-fg-muted">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <DeleteFinishButton
                        projectId={params.projectId}
                        finishId={option.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
