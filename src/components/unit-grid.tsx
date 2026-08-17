'use client'

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

interface Unit {
  id: string
  code: string
  floor?: number
  m2?: string
  price?: string
  orientation?: string
  bedrooms?: number
  status: string
}

interface UnitGridProps {
  units: Unit[]
  loading?: boolean
  onUnitSelect?: (unit: Unit) => void
}

export function UnitGrid({ units, loading, onUnitSelect }: UnitGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64" />
        ))}
      </div>
    )
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 font-medium mb-2">No units found</p>
        <p className="text-sm text-gray-500">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {units.map((unit) => (
        <div
          key={unit.id}
          onClick={() => onUnitSelect?.(unit)}
          className="bg-white rounded-lg shadow hover:shadow-lg transition border border-gray-200 hover:border-blue-300 overflow-hidden cursor-pointer"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-2xl font-bold text-gray-900">{unit.code}</p>
                {unit.floor !== undefined && (
                  <p className="text-xs text-gray-600 mt-1">Floor {unit.floor}</p>
                )}
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  unit.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : unit.status === 'reserved'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {unit.status}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Price */}
            {unit.price && (
              <div className="border-b pb-3">
                <p className="text-xs text-gray-500 mb-1">Price</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatPrice(unit.price)}
                </p>
              </div>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3">
              {unit.m2 && (
                <div>
                  <p className="text-xs text-gray-500">Size</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatM2(unit.m2)}
                  </p>
                </div>
              )}

              {unit.bedrooms !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Bedrooms</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {unit.bedrooms}
                  </p>
                </div>
              )}

              {unit.orientation && (
                <div>
                  <p className="text-xs text-gray-500">Orientation</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {unit.orientation}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t">
            <button className="w-full text-xs font-medium text-blue-600 hover:text-blue-700">
              View Details →
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
