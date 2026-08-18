export const UNIT_STATUSES = ['available', 'reserved', 'sold'] as const
export type UnitStatus = (typeof UNIT_STATUSES)[number]

export const UNIT_STATUS_LABEL: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  sold: 'Vendida',
}

/** Suggested values; the column is free text so tenants can use their own. */
export const ORIENTATIONS = [
  'Norte',
  'Sur',
  'Este',
  'Oeste',
  'Noreste',
  'Noroeste',
  'Sureste',
  'Suroeste',
] as const

export const CURRENCIES = ['USD', 'ARS', 'EUR'] as const
