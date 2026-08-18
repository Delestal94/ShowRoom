import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { UploadTourForm } from '@/components/upload-tour-form'

export const metadata: Metadata = { title: 'Subir tour' }

const FORMATS = [
  { icon: '🏢', title: 'Modelos 3D (GLB)', body: 'Exportados desde Blender, 3ds Max, etc. Máx 50MB.' },
  { icon: '🔄', title: 'Panorámica 360°', body: 'Imágenes en proyección equirectangular (JPEG/PNG). Máx 100MB.' },
  { icon: '📷', title: 'Fotos', body: 'Fotos y renders estándar (JPEG/PNG/WebP). Máx 100MB.' },
  { icon: '🚁', title: 'Video drone', body: 'MP4 o WebM. Máx 500MB.' },
]

export default async function UploadTourPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-4">
        <h1 className="text-title font-semibold text-fg">Subir tour</h1>
        <p className="mt-1 text-fg-muted">
          Sumá modelos 3D, panorámicas 360°, videos o fotos a{' '}
          <span className="font-medium text-fg">{project.name}</span>.
        </p>
      </div>

      <div className="mt-8">
        <UploadTourForm projectId={params.projectId} />

        <div className="mt-6 rounded-2xl border border-border bg-surface/40 p-6">
          <h3 className="font-semibold text-fg">Formatos soportados</h3>
          <div className="mt-4 space-y-4">
            {FORMATS.map((f) => (
              <div key={f.title} className="flex gap-3">
                <span className="text-lg">{f.icon}</span>
                <div>
                  <p className="text-sm font-medium text-fg">{f.title}</p>
                  <p className="text-sm text-fg-muted">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
