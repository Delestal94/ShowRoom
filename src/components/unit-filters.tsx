'use client'

import { useState, useEffect } from 'react'

interface FilterOptions {
  priceRange: { min: number; max: number }
  m2Range: { min: number; max: number }
  orientations: string[]
  bedrooms: number[]
  floors: number[]
}

interface UnitFiltersProps {
  onFiltersChange: (filters: Record<string, any>) => void
  filterOptions?: FilterOptions
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-surface-2/60 px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'

const labelCls = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-fg-subtle'

function money(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}

export function UnitFilters({ onFiltersChange, filterOptions }: UnitFiltersProps) {
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minM2, setMinM2] = useState('')
  const [maxM2, setMaxM2] = useState('')
  const [orientation, setOrientation] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [floor, setFloor] = useState('')
  const [search, setSearch] = useState('')

  // Debounced so typing in the text inputs doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: Record<string, any> = {}
      if (minPrice) filters.minPrice = parseFloat(minPrice)
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice)
      if (minM2) filters.minM2 = parseFloat(minM2)
      if (maxM2) filters.maxM2 = parseFloat(maxM2)
      if (orientation) filters.orientation = orientation
      if (bedrooms) filters.bedrooms = parseInt(bedrooms)
      if (floor) filters.floor = parseInt(floor)
      if (search) filters.search = search
      onFiltersChange(filters)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice, minM2, maxM2, orientation, bedrooms, floor, search])

  const activeCount = [
    minPrice, maxPrice, minM2, maxM2, orientation, bedrooms, floor, search,
  ].filter(Boolean).length

  const clearAll = () => {
    setMinPrice(''); setMaxPrice(''); setMinM2(''); setMaxM2('')
    setOrientation(''); setBedrooms(''); setFloor(''); setSearch('')
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-fg">Filtros</h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-primary transition-colors hover:underline"
          >
            Limpiar ({activeCount})
          </button>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="f-search" className={labelCls}>
            Código de unidad
          </label>
          <input
            id="f-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="8B, A-202…"
            className={inputCls}
          />
        </div>

        <div>
          <span className={labelCls}>
            Precio
            {filterOptions && (
              <span className="ml-1 font-normal normal-case tracking-normal text-fg-subtle">
                ({money(filterOptions.priceRange.min)} – {money(filterOptions.priceRange.max)})
              </span>
            )}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              inputMode="numeric"
              placeholder="Mínimo"
              aria-label="Precio mínimo"
              className={inputCls}
            />
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              inputMode="numeric"
              placeholder="Máximo"
              aria-label="Precio máximo"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <span className={labelCls}>Superficie (m²)</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={minM2}
              onChange={(e) => setMinM2(e.target.value)}
              inputMode="numeric"
              placeholder="Mínimo"
              aria-label="Superficie mínima"
              className={inputCls}
            />
            <input
              value={maxM2}
              onChange={(e) => setMaxM2(e.target.value)}
              inputMode="numeric"
              placeholder="Máximo"
              aria-label="Superficie máxima"
              className={inputCls}
            />
          </div>
        </div>

        {filterOptions && filterOptions.bedrooms.length > 0 && (
          <div>
            <label htmlFor="f-bed" className={labelCls}>
              Dormitorios
            </label>
            <select
              id="f-bed"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className={inputCls}
            >
              <option value="">Cualquiera</option>
              {filterOptions.bedrooms.map((b) => (
                <option key={b} value={b}>
                  {b} {b === 1 ? 'dormitorio' : 'dormitorios'}
                </option>
              ))}
            </select>
          </div>
        )}

        {filterOptions && filterOptions.orientations.length > 0 && (
          <div>
            <label htmlFor="f-or" className={labelCls}>
              Orientación
            </label>
            <select
              id="f-or"
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              className={inputCls}
            >
              <option value="">Cualquiera</option>
              {filterOptions.orientations.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        )}

        {filterOptions && filterOptions.floors.length > 0 && (
          <div>
            <label htmlFor="f-floor" className={labelCls}>
              Piso
            </label>
            <select
              id="f-floor"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className={inputCls}
            >
              <option value="">Cualquiera</option>
              {filterOptions.floors.map((f) => (
                <option key={f} value={f}>
                  Piso {f}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
