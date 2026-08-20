import type { Metadata } from 'next'
import { notFound } from 'next/navigation'





import { UnitDetailClient } from '@/components/unit-detail-client'
import { UnitJsonLd, BreadcrumbJsonLd } from '@/components/json-ld'
import { getSiteUrl } from '@/lib/site-url'
import {
  getCachedProject,
  getCachedProjectContent,
  getCachedUnit,
  getCachedUnitTours,
  getCachedSiblings,
} from '@/modules/public/cached-storefront'

/**
 * Resolves project + unit for the public detail page. Both queries run
 * without tenant context, so RLS only returns rows when the project is
 * published — an unpublished project's units are simply not found.
 */
async function load(projectSlug: string, unitCode: string) {
  const project = await getCachedProject(projectSlug)
  if (!project || project.status !== 'published') return null

  const unit = await getCachedUnit(project.id, unitCode, projectSlug)
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

  const canonical = new URL(
    `/${project.slug}/unidad/${encodeURIComponent(unit.code)}`,
    getSiteUrl()
  ).toString()

  return {
    title: `Unidad ${unit.code} · ${project.name}`,
    description: `${bits.join(' · ')} en ${project.name}.`,
    alternates: { canonical },
    openGraph: {
      title: `Unidad ${unit.code} · ${project.name}`,
      description: bits.join(' · '),
      url: canonical,
    },
    twitter: { card: 'summary_large_image' },
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

  const [unitTours, content, siblings] = await Promise.all([
    getCachedUnitTours(unit.id, project.slug),
    getCachedProjectContent(project.id, project.slug),
    getCachedSiblings(project.id, project.slug),
  ])
  const projectTours = content.tours

  const base = getSiteUrl()
  const canonical = new URL(
    `/${project.slug}/unidad/${encodeURIComponent(unit.code)}`,
    base
  ).toString()

  return (
    <>
      <UnitJsonLd
        code={unit.code}
        projectName={project.name}
        url={canonical}
        price={unit.price ? Number(unit.price) : null}
        currency={unit.currency}
        m2={unit.m2 ? Number(unit.m2) : null}
        bedrooms={unit.bedrooms}
        address={(project as any).address ?? null}
        available={unit.status === 'available'}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Inicio', url: base.origin },
          { name: project.name, url: new URL(`/${project.slug}`, base).toString() },
          { name: `Unidad ${unit.code}`, url: canonical },
        ]}
      />
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
    </>
  )
}
