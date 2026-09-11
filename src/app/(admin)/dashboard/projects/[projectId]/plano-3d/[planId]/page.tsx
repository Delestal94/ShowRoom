import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { getFloorPlan } from '@/modules/floor-plans/floor-plan-service'
import { PlanStudio } from '@/components/plan3d/plan-studio'

export const metadata: Metadata = { title: 'Plano a 3D' }

export default async function FloorPlanEditorPage({
  params,
}: {
  params: { projectId: string; planId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const plan = await getFloorPlan(tenant.tenantId, params.planId)
  if (!plan || plan.projectId !== params.projectId || !plan.sourceCdnUrl) notFound()

  return (
    <div>
      <Link
        href={`/dashboard/projects/${params.projectId}/plano-3d`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver a plantas
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title font-semibold text-fg">{plan.name}</h1>
            <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
              Prototipo
            </span>
          </div>
          <p className="mt-1 max-w-prose text-fg-muted">
            {project.name}
            {plan.level !== null ? ` · Piso ${plan.level}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <PlanStudio
          projectId={project.id}
          projectName={project.name}
          floorPlanId={plan.id}
          initialSourceUrl={plan.sourceCdnUrl}
          initialModelJson={(plan.modelJson as Record<string, unknown>) ?? null}
          initialPxPerMeter={plan.pxPerMeter !== null ? Number(plan.pxPerMeter) : null}
        />
      </div>
    </div>
  )
}
