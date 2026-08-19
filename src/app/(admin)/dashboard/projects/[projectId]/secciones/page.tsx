import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { updateSectionsAction } from './actions'
import { SectionsForm } from './sections-form'

export const metadata: Metadata = { title: 'Secciones' }

export default async function SeccionesPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-4">
        <h1 className="text-title font-semibold text-fg">Secciones del proyecto</h1>
        <p className="mt-1 text-fg-muted">
          Amenities y financiación. Sólo aparecen en la página pública las que tengan
          contenido cargado.
        </p>
      </div>

      <div className="mt-8">
        <SectionsForm
          action={updateSectionsAction.bind(null, params.projectId)}
          projectId={params.projectId}
          amenities={(project.amenitiesJson ?? []) as Record<string, string>[]}
          financing={(project.financingJson ?? []) as Record<string, string>[]}
        />
      </div>
    </div>
  )
}
