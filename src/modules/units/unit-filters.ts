import { publicDb as db } from '@/server/db/tenant-db'
import { units } from '@/server/db/schema'
import { eq, and, gte, lte, ilike } from 'drizzle-orm'

export interface UnitFilterParams {
  projectId: string
  tenantId: string
  minPrice?: number
  maxPrice?: number
  minM2?: number
  maxM2?: number
  orientation?: string
  bedrooms?: number
  floor?: number
  status?: string
  search?: string
}

export async function searchUnits(params: UnitFilterParams) {
  const {
    projectId,
    tenantId,
    minPrice,
    maxPrice,
    minM2,
    maxM2,
    orientation,
    bedrooms,
    floor,
    status = 'available',
    search,
  } = params

  let query = db.query.units.findMany({
    where: and(
      eq(units.projectId, projectId),
      eq(units.tenantId, tenantId),
      // Price filter
      minPrice ? gte(units.price, minPrice.toString()) : undefined,
      maxPrice ? lte(units.price, maxPrice.toString()) : undefined,
      // Size filter
      minM2 ? gte(units.m2, minM2.toString()) : undefined,
      maxM2 ? lte(units.m2, maxM2.toString()) : undefined,
      // Status filter (default: available)
      status ? eq(units.status, status) : undefined,
      // Orientation filter
      orientation ? eq(units.orientation, orientation) : undefined,
      // Bedrooms filter
      bedrooms ? eq(units.bedrooms, bedrooms) : undefined,
      // Floor filter
      floor ? eq(units.floor, floor) : undefined,
      // Search in code
      search ? ilike(units.code, `%${search}%`) : undefined
    ),
  })

  return query
}

export function getFilterOptions(unitsList: any[]) {
  // Extract unique filter values from units
  const prices = unitsList
    .filter((u) => u.price)
    .map((u) => parseFloat(u.price as any))
    .sort((a, b) => a - b)

  const m2s = unitsList
    .filter((u) => u.m2)
    .map((u) => parseFloat(u.m2 as any))
    .sort((a, b) => a - b)

  const orientations = [...new Set(unitsList.map((u) => u.orientation).filter(Boolean))]
  const bedrooms = [...new Set(unitsList.map((u) => u.bedrooms).filter(Boolean))].sort()
  const floors = [...new Set(unitsList.map((u) => u.floor).filter(Boolean))].sort()

  return {
    priceRange: {
      min: prices[0] || 0,
      max: prices[prices.length - 1] || 1000000,
    },
    m2Range: {
      min: m2s[0] || 0,
      max: m2s[m2s.length - 1] || 500,
    },
    orientations,
    bedrooms,
    floors,
  }
}

export function formatPrice(value?: string | number): string {
  if (!value) return '$0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(num)
}

export function formatM2(value?: string | number): string {
  if (!value) return '0 m²'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${Math.round(num)} m²`
}
