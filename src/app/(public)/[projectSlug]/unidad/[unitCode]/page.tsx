import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { publicDb as db } from '@/server/db/tenant-db'
import { projects, units } from '@/server/db/schema'
import { getPublicUnitByCode } from '@/modules/units/unit-service'
import {
  listPublicToursByProject,
  listPublicToursByUnit,
} from '@/modules/tours/tour-service'
import { UnitDetailClient } from '@/components/unit-detail-client'

/**
 * Resolves project + unit for the public detail page. Both queries run
 * without tenant context, so RLS only returns rows when the project is
 * published — an unpublished project's units are simply not found.
 */
async function load(projectSlug: string, unitCode: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, projectSlug),
    columns: { id: true, name: true, slug: true, status: true },
    with: { tenant: { columns: { contactWhatsapp: true } } },
  })

  if (!project || project.status !== 'published') return null

  const unit = await getPublicUnitByCode(project.id, unitCode)
  if (!unit) return null

  return { project, unit }
}

export async function generateMetadata({
  params,
}: {
  params: { projectSlug: string; unitCode: string }
}): Promise<Metadata> {
  const data = await load(params.projectSlug, decodeURIComponent(params.unitCode))
  if (!data) return { title: 'Unidad no encontrada' }

  const { project, unit } = data
  const bits = [
    unit.m2 ? `${Math.round(Number(unit.m2))} m²` : null,
    unit.bedrooms ? `${unit.bedrooms} dorm.` : null,
    unit.orientation,
  ].filter(Boolean)

  return {
    title: `Unidad ${unit.code} · ${project.name}`,
    description: `${bits.join(' · ')} en ${project.name}.`,
    openGraph: {
      title: `Unidad ${unit.code} · ${project.name}`,
      description: bits.join(' · '),
    },
  }
}

export default async function UnitDetailPage({
  params,
}: {
  params: { projectSlug: string; unitCode: string }
}) {
  const unitCode = decodeURIComponent(params.unitCode)
  const data = await load(params.projectSlug, unitCode)
  if (!data) notFound()

  const { project, unit } = data

  const [unitTours, projectTours, siblings] = await Promise.all([
    listPublicToursByUnit(unit.id),
    listPublicToursByProject(project.id),
    db.query.units.findMany({
      where: eq(units.projectId, project.id),
      columns: { code: true, status: true, m2: true },
      orderBy: (u, { asc }) => [asc(u.code)],
    }),
  ])

  return (
    <UnitDetailClient
      projectSlug={project.slug}
      projectName={project.name}
      unit={unit as any}
      unitTours={unitTours as any}
      // Only tours not tied to a unit stand in for the project as a whole;
      // another unit's interior would be misleading here.
      projectTours={projectTours.filter((t) => !t.unitId) as any}
      siblings={siblings.filter((s) => s.code !== unit.code)}
      whatsappNumber={project.tenant?.contactWhatsapp ?? null}
    />
  )
}
