'use client'

import { useState, useEffect, useMemo } from 'react'
import { StorefrontHero } from './storefront-hero'
import { UnitFilters } from './unit-filters'
import { UnitGrid } from './unit-grid'
import { ContactForm } from './contact-form'
import { ProjectMap } from './project-map'
import { ConstructionTimeline, type ConstructionUpdate } from './construction-timeline'
import { FinishComparator, type Finish } from './finish-comparator'
import {
  AmenitiesSection,
  FinancingSection,
  PortfolioSection,
  type Amenity,
  type FinancingPlan,
  type PortfolioItem,
} from './project-sections'
import { MobileContactBar } from './mobile-contact-bar'
import { LogoMark } from './ui/logo'
import { trackEvent } from '@/lib/analytics'

interface Tour {
  id: string
  kind: '360' | 'glb-model' | 'drone-video' | 'image'
  cdnUrl?: string
  storageKey: string
  metadataJson?: Record<string, any>
  status: string
}

interface Unit {
  id: string
  code: string
  floor?: number
  m2?: string
  price?: string
  currency?: string
  status: string
  orientation?: string
  bedrooms?: number
}

interface FilterOptions {
  priceRange: { min: number; max: number }
  m2Range: { min: number; max: number }
  orientations: string[]
  bedrooms: number[]
  floors: number[]
}

interface StorefrontClientProps {
  projectSlug: string
  projectName: string
  projectAddress: string
  initialUnits: Unit[]
  tours: Tour[]
  whatsappNumber?: string | null
  geo?: { lat: number; lng: number } | null
  pointsOfInterest?: { name: string; distance?: string }[]
  /**
   * Embedded in the client's own site or shown on a touch screen: drops the
   * ShowRoom footer and the outbound link, which would take a visitor away
   * from the host page (or off the kiosk entirely).
   */
  embed?: boolean
  constructionUpdates?: ConstructionUpdate[]
  finishes?: Finish[]
  amenities?: Amenity[]
  financing?: FinancingPlan[]
  portfolio?: PortfolioItem[]
  developerName?: string
}

export function StorefrontClient({
  projectSlug,
  projectName,
  projectAddress,
  initialUnits,
  tours,
  whatsappNumber,
  geo,
  pointsOfInterest = [],
  embed = false,
  constructionUpdates = [],
  finishes = [],
  amenities = [],
  financing = [],
  portfolio = [],
  developerName,
}: StorefrontClientProps) {
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [filters, setFilters] = useState<Record<string, any>>({})

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}/units/search`)
      .then((r) => r.json())
      .then((d) => setFilterOptions(d.filterOptions))
      .catch((e) => console.error('No se pudieron cargar los filtros:', e))

    trackEvent({
      type: 'page_view',
      projectSlug,
      metadata: { page: 'storefront' },
    })
  }, [projectSlug])

  useEffect(() => {
    const controller = new AbortController()

    const fetchUnits = async () => {
      setLoading(true)
      // Un intento nuevo limpia el error anterior: si no, el encabezado sigue
      // diciendo "no pudimos cargar" mientras la grilla ya está buscando.
      setLoadError(false)
      try {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(filters)) {
          if (value !== '' && value != null) params.append(key, String(value))
        }

        const res = await fetch(
          `/api/projects/${projectSlug}/units/search?${params}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setUnits(data.units ?? [])
        setLoadError(false)
      } catch (error) {
        // Aborted requests are expected when filters change quickly.
        if ((error as Error).name !== 'AbortError') {
          console.error('No se pudieron cargar las unidades:', error)
          // Sin esto la grilla muestra "no hay unidades que coincidan", que le
          // miente al comprador: el proyecto sí las tiene, falló la consulta.
          setLoadError(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchUnits()
    return () => controller.abort()
  }, [filters, projectSlug])

  const retry = () => setFilters((f) => ({ ...f }))

  const available = units.filter((u) => u.status === 'available').length

  const { minPrice, currency } = useMemo(() => {
    const available = initialUnits.filter(
      (u) => u.status === 'available' && Number(u.price) > 0
    )
    const min = available.length
      ? Math.min(...available.map((u) => Number(u.price)))
      : null
    return { minPrice: min, currency: available[0]?.currency ?? 'USD' }
  }, [initialUnits])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/60 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-fg">
              {projectName}
            </h1>
            {projectAddress && (
              <p className="truncate text-xs text-fg-muted">{projectAddress}</p>
            )}
          </div>
          <nav className="hidden shrink-0 items-center gap-1 sm:flex">
            <a
              href="#unidades"
              className="rounded-full px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              Unidades
            </a>
            {amenities.length > 0 && (
              <a
                href="#amenities"
                className="rounded-full px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                Amenities
              </a>
            )}
            {finishes.length > 0 && (
              <a
                href="#terminaciones"
                className="rounded-full px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                Terminaciones
              </a>
            )}
            {constructionUpdates.length > 0 && (
              <a
                href="#avances"
                className="rounded-full px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                Avance de obra
              </a>
            )}
            {geo && (
              <a
                href="#ubicacion"
                className="rounded-full px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                Ubicación
              </a>
            )}
          </nav>
        </div>
      </header>

      <StorefrontHero
        projectSlug={projectSlug}
        projectName={projectName}
        projectAddress={projectAddress}
        tours={tours}
        whatsappNumber={whatsappNumber}
        availableCount={available}
        minPrice={minPrice}
        currency={currency}
      />

      <main className="container-page py-8 sm:py-12">
        <section id="unidades" className="scroll-mt-20">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-title font-semibold text-fg">Unidades</h2>
            <p className="text-sm text-fg-muted">
              {loadError
                ? 'No pudimos cargar el listado'
                : loading
                ? 'Buscando…'
                : `${units.length} ${units.length === 1 ? 'resultado' : 'resultados'}` +
                  (available !== units.length ? ` · ${available} disponibles` : '')}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <UnitFilters onFiltersChange={setFilters} filterOptions={filterOptions ?? undefined} />
            </div>

            <UnitGrid
              units={units}
              loading={loading}
              error={loadError}
              onRetry={retry}
              projectSlug={projectSlug}
            />
          </div>
        </section>

        {amenities.length > 0 && (
          <section id="amenities" className="mt-16 scroll-mt-20">
            <h2 className="text-title font-semibold text-fg">Amenities</h2>
            <div className="mt-6">
              <AmenitiesSection amenities={amenities} />
            </div>
          </section>
        )}

        {finishes.length > 0 && (
          <section id="terminaciones" className="mt-16 scroll-mt-20">
            <h2 className="text-title font-semibold text-fg">Terminaciones</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Elegí entre las opciones disponibles para ver cómo queda.
            </p>
            <div className="mt-6">
              <FinishComparator finishes={finishes} />
            </div>
          </section>
        )}

        {constructionUpdates.length > 0 && (
          <section id="avances" className="mt-16 scroll-mt-20">
            <h2 className="text-title font-semibold text-fg">Avance de obra</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Cómo viene el proyecto, actualizado por la desarrolladora.
            </p>
            <div className="mt-6">
              <ConstructionTimeline updates={constructionUpdates} />
            </div>
          </section>
        )}

        {financing.length > 0 && (
          <section id="financiacion" className="mt-16 scroll-mt-20">
            <h2 className="text-title font-semibold text-fg">Financiación</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Opciones disponibles para esta preventa.
            </p>
            <div className="mt-6">
              <FinancingSection plans={financing} />
            </div>
          </section>
        )}

        {geo && (
          <section id="ubicacion" className="mt-16 scroll-mt-20">
            <h2 className="text-title font-semibold text-fg">Ubicación</h2>
            <div className="mt-6">
              <ProjectMap
                lat={geo.lat}
                lng={geo.lng}
                projectName={projectName}
                address={projectAddress}
                pointsOfInterest={pointsOfInterest}
              />
            </div>
          </section>
        )}

        <section id="contacto" className="mx-auto mt-16 max-w-xl scroll-mt-20">
          <ContactForm
            projectSlug={projectSlug}
            projectName={projectName}
            whatsappNumber={whatsappNumber}
          />
        </section>
      </main>

      {portfolio.length > 0 && (
        <section className="container-page mt-16">
          <h2 className="text-title font-semibold text-fg">
            Obras entregadas{developerName ? ` por ${developerName}` : ''}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Proyectos que ya construimos y entregamos.
          </p>
          <div className="mt-6">
            <PortfolioSection items={portfolio} />
          </div>
        </section>
      )}

      {/* En embed no va: es una barra fixed dentro de un iframe que puede ser
          más bajo que ella, así que taparía el contenido para siempre, y su
          link de WhatsApp se lleva al visitante fuera del sitio anfitrión. */}
      {!embed && (
        <MobileContactBar
          projectSlug={projectSlug}
          projectName={projectName}
          whatsappNumber={whatsappNumber}
          formHref="#contacto"
        />
      )}

      {!embed && (
        <footer className="mt-16 border-t border-border">
          <div className="container-page flex flex-col items-center justify-between gap-3 py-8 sm:flex-row">
            <p className="text-sm text-fg-subtle">{projectName}</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-fg-subtle transition-colors hover:text-fg"
            >
              <LogoMark className="h-4 w-4" />
              Hecho con ShowRoom
            </a>
          </div>
        </footer>
      )}

      {/* Va último: la barra es fixed al pie, así que el aire tiene que estar
          después del footer para que no lo tape al llegar al final. */}
      {!embed && <div aria-hidden className="h-24 lg:hidden" />}
    </div>
  )
}
