import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { getUnit } from '@/modules/units/unit-service'
import { listToursByUnit } from '@/modules/tours/tour-service'
import { getSiteUrl } from '@/lib/site-url'
import { UploadTourForm } from '@/components/upload-tour-form'
import { UnitSpecCard } from '@/components/unit-spec-card'
import { ButtonLink } from '@/components/ui/button'
import { DeleteTourButton } from './delete-tour-button'

export const metadata: Metadata = { title: 'Unidad' }

const TOUR_KIND_LABEL: Record<string, string> = {
  '360': 'Panorámica 360°',
  'glb-model': 'Modelo 3D',
  image: 'Foto / render',
  'drone-video': 'Video drone',
}

export default async function UnitDetailAdminPage({
  params,
}: {
  params: { projectId: string; unitId: string }
}) {
  const tenant = await requireCurrentTenant()
  const [project, unit] = await Promise.all([
    getProject(tenant.tenantId, params.projectId),
    getUnit(tenant.tenantId, params.unitId),
  ])

  if (!project || !unit || unit.projectId !== params.projectId) notFound()

  const tours = await listToursByUnit(tenant.tenantId, params.unitId)
  const publicUrl = new URL(
    `/${project.slug}/unidad/${encodeURIComponent(unit.code)}`,
    getSiteUrl()
  ).toString()

  return (
    <div>
      <Link
        href={`/dashboard/projects/${params.projectId}/units`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver a unidades
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-fg">Unidad {unit.code}</h1>
          <p className="mt-1 text-fg-muted">{project.name}</p>
        </div>
        {project.status === 'published' && (
          <ButtonLink href={publicUrl} variant="outline" size="sm" target="_blank">
            Ver ficha pública ↗
          </ButtonLink>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface/50 p-6">
            <h2 className="font-semibold text-fg">Contenido de esta unidad</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Renders interiores, plano, recorrido 360 propio. Si no cargás nada, la ficha
              pública muestra el recorrido general del proyecto.
            </p>

            {tours.length === 0 ? (
              <p className="mt-5 rounded-md border border-dashed border-border p-6 text-center text-sm text-fg-muted">
                Todavía no hay contenido propio de esta unidad.
              </p>
            ) : (
              <div className="mt-5 space-y-2">
                {tours.map((tour) => (
                  <div
                    key={tour.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">
                        {TOUR_KIND_LABEL[tour.kind] ?? tour.kind}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-fg-subtle">
                        {tour.storageKey.split('/').pop()}
                      </p>
                    </div>
                    <DeleteTourButton
                      projectId={params.projectId}
                      unitId={params.unitId}
                      tourId={tour.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <UploadTourForm projectId={params.projectId} unitId={params.unitId} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <UnitSpecCard
            code={unit.code}
            floor={unit.floor}
            m2={unit.m2}
            price={unit.price}
            currency={unit.currency}
            bedrooms={unit.bedrooms}
            orientation={unit.orientation}
            status={unit.status}
            attrs={unit.attrsJson as Record<string, unknown> | null}
          />
          <p className="mt-3 text-xs text-fg-subtle">
            Los datos de la unidad se editan desde la tabla de unidades.
          </p>
        </aside>
      </div>
    </div>
  )
}
