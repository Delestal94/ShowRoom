'use client'

import { useState, useEffect } from 'react'
import { TourViewer } from './tour-viewer'
import { UnitFilters } from './unit-filters'
import { UnitGrid } from './unit-grid'
import { ContactForm } from './contact-form'
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
}

export function StorefrontClient({
  projectSlug,
  projectName,
  projectAddress,
  initialUnits,
  tours,
}: StorefrontClientProps) {
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<Record<string, any>>({})

  // Load filter options on mount and track page view
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const searchParams = new URLSearchParams()
        const res = await fetch(
          `/api/projects/${projectSlug}/units/search?${searchParams}`
        )
        const data = await res.json()
        setFilterOptions(data.filterOptions)
      } catch (error) {
        console.error('Failed to load filter options:', error)
      }
    }

    loadFilterOptions()

    // Track page view
    trackEvent({
      type: 'page_view',
      projectSlug,
      metadata: {
        page: 'storefront',
      },
    })
  }, [projectSlug])

  // Fetch units when filters change
  useEffect(() => {
    const fetchUnits = async () => {
      setLoading(true)
      try {
        const searchParams = new URLSearchParams()

        // Add active filters to query
        if (filters.minPrice) searchParams.append('minPrice', filters.minPrice)
        if (filters.maxPrice) searchParams.append('maxPrice', filters.maxPrice)
        if (filters.minM2) searchParams.append('minM2', filters.minM2)
        if (filters.maxM2) searchParams.append('maxM2', filters.maxM2)
        if (filters.orientation) searchParams.append('orientation', filters.orientation)
        if (filters.bedrooms) searchParams.append('bedrooms', filters.bedrooms)
        if (filters.floor) searchParams.append('floor', filters.floor)
        if (filters.search) searchParams.append('search', filters.search)

        const res = await fetch(
          `/api/projects/${projectSlug}/units/search?${searchParams}`
        )
        const data = await res.json()
        setUnits(data.units)
      } catch (error) {
        console.error('Failed to fetch units:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUnits()
  }, [filters, projectSlug])

  const readyTours = tours.filter((t) => t.status === 'ready')

  return (
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{projectName}</h1>
          <p className="text-gray-600 mt-2">{projectAddress}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: 3D Viewer */}
          <div className="lg:col-span-2">
            {readyTours.length > 0 ? (
              <div style={{ aspectRatio: '16/9' }}>
                <TourViewer tours={readyTours as any} projectSlug={projectSlug} />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full bg-gray-100 rounded-lg border-2 border-gray-200"
                style={{ aspectRatio: '16/9' }}>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">No tours available yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Contact Form & Filters */}
          <aside>
            <div className="sticky top-24 space-y-6">
              <ContactForm projectSlug={projectSlug} projectId={projectSlug} />

              {filterOptions && (
                <UnitFilters
                  onFiltersChange={setFilters}
                  filterOptions={filterOptions}
                />
              )}
            </div>
          </aside>
        </div>

        {/* Units Grid */}
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Available Units
            </h2>
            <p className="text-gray-600">
              {units.length} unit{units.length !== 1 ? 's' : ''} matching your criteria
            </p>
          </div>

          <UnitGrid units={units} loading={loading} projectSlug={projectSlug} />
        </div>
      </main>
    </div>
  )
}
