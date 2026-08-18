'use client'

import { useState, useEffect } from 'react'
import { TourViewer } from './tour-viewer'
import { UnitFilters } from './unit-filters'
import { UnitGrid } from './unit-grid'
import { ContactForm } from './contact-form'
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
}

export function StorefrontClient({
  projectSlug,
  projectName,
  projectAddress,
  initialUnits,
  tours,
  whatsappNumber,
}: StorefrontClientProps) {
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(false)
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
      try {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(filters)) {
          if (value !== '' && value != null) params.append(key, String(value))
        }

        const res = await fetch(
          `/api/projects/${projectSlug}/units/search?${params}`,
          { signal: controller.signal }
        )
        const data = await res.json()
        setUnits(data.units ?? [])
      } catch (error) {
        // Aborted requests are expected when filters change quickly.
        if ((error as Error).name !== 'AbortError') {
          console.error('No se pudieron cargar las unidades:', error)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchUnits()
    return () => controller.abort()
  }, [filters, projectSlug])

  const readyTours = tours.filter((t) => t.status === 'ready')
  const available = units.filter((u) => u.status === 'available').length

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-fg">
              {projectName}
            </h1>
            {projectAddress && (
              <p className="truncate text-xs text-fg-muted">{projectAddress}</p>
            )}
          </div>
          <a
            href="#unidades"
            className="hidden shrink-0 rounded-full border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg sm:inline-flex"
          >
            Ver unidades
          </a>
        </div>
      </header>

      <main className="container-page py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="aspect-[16/10] lg:aspect-auto lg:min-h-[30rem]">
            {readyTours.length > 0 ? (
              <TourViewer tours={readyTours as any} projectSlug={projectSlug} />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30">
                <div className="px-6 text-center">
                  <LogoMark className="mx-auto h-10 w-10 opacity-40" />
                  <p className="mt-4 font-medium text-fg">
                    Todavía no hay un recorrido cargado
                  </p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Mientras tanto, podés ver las unidades disponibles más abajo.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ContactForm
              projectSlug={projectSlug}
              projectName={projectName}
              whatsappNumber={whatsappNumber}
            />
          </aside>
        </div>

        <section id="unidades" className="mt-16 scroll-mt-20">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-title font-semibold text-fg">Unidades</h2>
            <p className="text-sm text-fg-muted">
              {loading
                ? 'Buscando…'
                : `${units.length} ${units.length === 1 ? 'resultado' : 'resultados'}` +
                  (available !== units.length ? ` · ${available} disponibles` : '')}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <UnitFilters onFiltersChange={setFilters} filterOptions={filterOptions ?? undefined} />
            </div>

            <UnitGrid units={units} loading={loading} projectSlug={projectSlug} />
          </div>
        </section>
      </main>

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
    </div>
  )
}
