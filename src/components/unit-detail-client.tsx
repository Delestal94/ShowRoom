'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TourViewer } from './tour-viewer'
import { ContactForm } from './contact-form'
import { UnitSpecCard } from './unit-spec-card'
import { LogoMark } from './ui/logo'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/cn'
import { UNIT_STATUS_LABEL } from '@/modules/units/unit-constants'

interface Tour {
  id: string
  kind: '360' | 'glb-model' | 'drone-video' | 'image'
  cdnUrl?: string
  storageKey: string
  status: string
}

interface Unit {
  id: string
  code: string
  floor: number | null
  m2: string | null
  price: string | null
  currency: string | null
  bedrooms: number | null
  orientation: string | null
  status: string
  attrsJson?: Record<string, unknown> | null
}

interface UnitDetailClientProps {
  projectSlug: string
  projectName: string
  unit: Unit
  /** Content attached to this unit; falls back to the project's when empty. */
  unitTours: Tour[]
  projectTours: Tour[]
  siblings: { code: string; status: string; m2: string | null }[]
  whatsappNumber?: string | null
}

export function UnitDetailClient({
  projectSlug,
  projectName,
  unit,
  unitTours,
  projectTours,
  siblings,
  whatsappNumber,
}: UnitDetailClientProps) {
  useEffect(() => {
    trackEvent({
      type: 'unit_view',
      projectSlug,
      unitId: unit.id,
      metadata: { unit_id: unit.id, unit_code: unit.code, page: 'unit_detail' },
    })
  }, [projectSlug, unit.id, unit.code])

  const readyUnitTours = unitTours.filter((t) => t.status === 'ready')
  const readyProjectTours = projectTours.filter((t) => t.status === 'ready')

  // Showing the project's tour is better than an empty frame, but it has to
  // be labelled — otherwise a generic render reads as this unit's interior.
  const usingFallback = readyUnitTours.length === 0 && readyProjectTours.length > 0
  const tours = readyUnitTours.length > 0 ? readyUnitTours : readyProjectTours

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/${projectSlug}`}
              className="truncate text-sm text-fg-muted transition-colors hover:text-fg"
            >
              ← {projectName}
            </Link>
          </div>
          <span className="shrink-0 font-mono text-sm text-fg-subtle">
            Unidad {unit.code}
          </span>
        </div>
      </header>

      <main className="container-page py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div>
            <div className="aspect-[16/10]">
              {tours.length > 0 ? (
                <TourViewer tours={tours as any} projectSlug={projectSlug} />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30">
                  <div className="px-6 text-center">
                    <LogoMark className="mx-auto h-10 w-10 opacity-40" />
                    <p className="mt-4 font-medium text-fg">
                      Esta unidad todavía no tiene contenido cargado
                    </p>
                  </div>
                </div>
              )}
            </div>

            {usingFallback && (
              <p className="mt-3 rounded-md border border-border bg-surface/40 px-4 py-2.5 text-xs text-fg-muted">
                Estás viendo el recorrido general del proyecto. Esta unidad todavía no tiene
                contenido propio.
              </p>
            )}

            {siblings.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm font-medium uppercase tracking-wider text-fg-subtle">
                  Otras unidades
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {siblings.map((s) => (
                    <Link
                      key={s.code}
                      href={`/${projectSlug}/unidad/${encodeURIComponent(s.code)}`}
                      className={cn(
                        'rounded-md border border-border px-3.5 py-2 text-sm transition-colors hover:border-primary/50 hover:text-fg',
                        s.status === 'sold' ? 'text-fg-subtle' : 'text-fg-muted'
                      )}
                      title={`${UNIT_STATUS_LABEL[s.status] ?? s.status}${
                        s.m2 ? ` · ${Math.round(Number(s.m2))} m²` : ''
                      }`}
                    >
                      {s.code}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <UnitSpecCard
              code={unit.code}
              floor={unit.floor}
              m2={unit.m2}
              price={unit.price}
              currency={unit.currency}
              bedrooms={unit.bedrooms}
              orientation={unit.orientation}
              status={unit.status}
              attrs={unit.attrsJson}
            />

            <a
              href={`/api/projects/${projectSlug}/unidad/${encodeURIComponent(unit.code)}/ficha`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border-strong text-sm font-medium text-fg transition-colors hover:bg-surface-2"
            >
              Descargar ficha PDF
            </a>

            {unit.status === 'sold' ? (
              <div className="rounded-2xl border border-border bg-surface/40 p-6 text-center">
                <p className="font-medium text-fg">Esta unidad ya se vendió</p>
                <Link
                  href={`/${projectSlug}#unidades`}
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  Ver unidades disponibles
                </Link>
              </div>
            ) : (
              <ContactForm
                projectSlug={projectSlug}
                projectName={projectName}
                unitCode={unit.code}
                whatsappNumber={whatsappNumber}
              />
            )}
          </aside>
        </div>
      </main>

      <footer className="mt-16 border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-8 sm:flex-row">
          <Link href={`/${projectSlug}`} className="text-sm text-fg-subtle hover:text-fg">
            {projectName}
          </Link>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-fg-subtle transition-colors hover:text-fg"
          >
            <LogoMark className="h-4 w-4" />
            Hecho con ShowRoom
          </a>
        </div>
      </footer>
    </div>
  )
}
