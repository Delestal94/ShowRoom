import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { listFloorPlansByProject } from '@/modules/floor-plans/floor-plan-service'
import { canEditFloorPlans } from '@/modules/tenancy/permissions'
import { ButtonLink } from '@/components/ui/button'
import { DeleteFloorPlanButton } from '@/components/plan3d/delete-floor-plan-button'

export const metadata: Metadata = { title: 'Plano a 3D' }

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
}

export default async function PlanoTo3DListPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const plans = await listFloorPlansByProject(tenant.tenantId, params.projectId)
  const canEdit = canEditFloorPlans(tenant.role)

  return (
    <div>
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-fg">Plano a 3D</h1>
          <p className="mt-1 max-w-prose text-fg-muted">
            Convertí las plantas de <span className="font-medium text-fg">{project.name}</span>{' '}
            en modelos 3D navegables: calibrás la escala, marcás los muros y las aberturas, y se
            extruye el volumen.
          </p>
        </div>
        {canEdit && (
          <ButtonLink href={`/dashboard/projects/${params.projectId}/plano-3d/new`} size="sm">
            + Nueva planta
          </ButtonLink>
        )}
      </div>

      <div className="mt-8">
        {plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
            <p className="font-medium text-fg">Todavía no hay ninguna planta cargada</p>
            <p className="mt-1 text-sm text-fg-muted">
              {canEdit
                ? 'Subí el plano de la planta baja, la planta tipo o cualquier otra para empezar.'
                : 'Todavía no se cargó ninguna planta de este proyecto.'}
            </p>
            {canEdit && (
              <ButtonLink
                href={`/dashboard/projects/${params.projectId}/plano-3d/new`}
                size="sm"
                className="mt-5"
              >
                + Nueva planta
              </ButtonLink>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/dashboard/projects/${params.projectId}/plano-3d/${plan.id}`}
                className="block rounded-2xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-fg">{plan.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={
                        plan.status === 'published'
                          ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success'
                          : 'rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning'
                      }
                    >
                      {STATUS_LABEL[plan.status] ?? plan.status}
                    </span>
                    {canEdit && (
                      <DeleteFloorPlanButton projectId={params.projectId} planId={plan.id} />
                    )}
                  </div>
                </div>
                {plan.level !== null && (
                  <p className="mt-1 text-sm text-fg-muted">Piso {plan.level}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
