'use client'

import { useState, useEffect } from 'react'

function formatPrice(value?: string | number): string {
  if (!value) return '$0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(num)
}

function formatM2(value?: string | number): string {
  if (!value) return '0 m²'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${Math.round(num)} m²`
}

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

export function UnitFilters({
  onFiltersChange,
  filterOptions,
}: UnitFiltersProps) {
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minM2, setMinM2] = useState('')
  const [maxM2, setMaxM2] = useState('')
  const [orientation, setOrientation] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [floor, setFloor] = useState('')
  const [search, setSearch] = useState('')

  // Trigger filter update when any filter changes
  useEffect(() => {
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
  }, [minPrice, maxPrice, minM2, maxM2, orientation, bedrooms, floor, search, onFiltersChange])

  const handleReset = () => {
    setMinPrice('')
    setMaxPrice('')
    setMinM2('')
    setMaxM2('')
    setOrientation('')
    setBedrooms('')
    setFloor('')
    setSearch('')
  }

  const hasActiveFilters =
    minPrice || maxPrice || minM2 || maxM2 || orientation || bedrooms || floor || search

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit Code
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g., 101, A-202"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Price Range */}
        {filterOptions && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Price Range
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder={`Min (${formatPrice(filterOptions.priceRange.min)})`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder={`Max (${formatPrice(filterOptions.priceRange.max)})`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Size Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Size
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minM2}
                    onChange={(e) => setMinM2(e.target.value)}
                    placeholder={`Min (${formatM2(filterOptions.m2Range.min)})`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    value={maxM2}
                    onChange={(e) => setMaxM2(e.target.value)}
                    placeholder={`Max (${formatM2(filterOptions.m2Range.max)})`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bedrooms */}
            {filterOptions.bedrooms.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Bedrooms
                </label>
                <div className="space-y-2">
                  {filterOptions.bedrooms.map((br) => (
                    <label key={br} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="bedrooms"
                        value={br}
                        checked={bedrooms === br.toString()}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{br} bed{br !== 1 ? 's' : ''}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="bedrooms"
                      value=""
                      checked={bedrooms === ''}
                      onChange={() => setBedrooms('')}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">All</span>
                  </label>
                </div>
              </div>
            )}

            {/* Orientation */}
            {filterOptions.orientations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All orientations</option>
                  {filterOptions.orientations.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Floor */}
            {filterOptions.floors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Floor
                </label>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All floors</option>
                  {filterOptions.floors.map((f) => (
                    <option key={f} value={f}>
                      Floor {f}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
