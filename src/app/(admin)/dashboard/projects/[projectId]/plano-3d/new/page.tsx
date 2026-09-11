import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { canEditFloorPlans } from '@/modules/tenancy/permissions'
import { getProject } from '@/modules/projects/project-service'
import { CreateFloorPlanForm } from '@/components/plan3d/create-floor-plan-form'

export const metadata: Metadata = { title: 'Nueva planta' }

export default async function NewFloorPlanPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()
  if (!canEditFloorPlans(tenant.role)) notFound()

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/dashboard/projects/${params.projectId}/plano-3d`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver a plantas
      </Link>

      <div className="mt-4">
        <h1 className="text-title font-semibold text-fg">Nueva planta</h1>
        <p className="mt-1 text-fg-muted">
          Subí el plano de <span className="font-medium text-fg">{project.name}</span> que
          querés convertir en 3D.
        </p>
      </div>

      <div className="mt-8">
        <CreateFloorPlanForm projectId={project.id} />
      </div>
    </div>
  )
}
