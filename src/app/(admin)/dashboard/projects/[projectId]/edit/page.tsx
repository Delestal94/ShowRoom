import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { updateProjectAction } from '../../actions'
import { EditProjectForm } from './edit-project-form'

export const metadata: Metadata = { title: 'Editar proyecto' }

export default async function EditProjectPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const geo = project.geo as { lat: number; lng: number } | null
  const poi = (project.pointsOfInterestJson ?? []) as {
    name: string
    distance?: string
  }[]

  const poiText = poi
    .map((p) => (p.distance ? `${p.name} — ${p.distance}` : p.name))
    .join('\n')

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-6 rounded-2xl border border-border bg-surface/50 p-8">
        <h1 className="text-title font-semibold text-fg">Editar proyecto</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Si cambiás el slug, el link público anterior deja de funcionar.
        </p>

        <EditProjectForm
          action={updateProjectAction.bind(null, params.projectId)}
          defaults={{
            name: project.name,
            slug: project.slug,
            address: project.address ?? '',
            coords: geo ? `${geo.lat}, ${geo.lng}` : '',
            pointsOfInterest: poiText,
          }}
        />
      </div>
    </div>
  )
}
