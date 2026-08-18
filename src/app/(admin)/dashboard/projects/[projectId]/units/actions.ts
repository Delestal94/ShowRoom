'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import {
  createUnit,
  createUnitsBulk,
  updateUnit,
  deleteUnit,
} from '@/modules/units/unit-service'
import { UNIT_STATUSES, type UnitStatus } from '@/modules/units/unit-constants'
import { checkCanCreate } from '@/modules/billing/billing-service'

export interface UnitActionState {
  error?: string
  notice?: string
}

/** Parses a user-entered decimal, tolerating "1.234,56" and "1234.56". */
function parseDecimal(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined

  // If both separators appear, the last one is the decimal separator.
  const lastComma = value.lastIndexOf(',')
  const lastDot = value.lastIndexOf('.')
  let normalized = value

  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? value.replace(/\./g, '').replace(',', '.')
        : value.replace(/,/g, '')
  } else if (lastComma > -1) {
    // A lone comma is a decimal separator in es-AR.
    normalized = value.replace(',', '.')
  }

  normalized = normalized.replace(/[^\d.]/g, '')
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 ? String(n) : undefined
}

function parseInteger(raw: string): number | undefined {
  const value = raw.trim()
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

function normalizeStatus(raw: string): UnitStatus {
  const value = raw.trim().toLowerCase()
  return (UNIT_STATUSES as readonly string[]).includes(value)
    ? (value as UnitStatus)
    : 'available'
}

/** Confirms the project belongs to the signed-in tenant before any write. */
async function assertProjectAccess(projectId: string) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) throw new Error('NOT_FOUND')
  return tenant
}

export async function createUnitAction(
  projectId: string,
  _prev: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
  const code = String(formData.get('code') ?? '').trim()
  if (!code) return { error: 'La unidad necesita un código (ej. 8B).' }

  let tenant
  try {
    tenant = await assertProjectAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  const limitError = await checkCanCreate(tenant.tenantId, 'unit')
  if (limitError) return { error: limitError }

  try {
    await createUnit(tenant.tenantId, projectId, {
      code,
      floor: parseInteger(String(formData.get('floor') ?? '')),
      m2: parseDecimal(String(formData.get('m2') ?? '')),
      price: parseDecimal(String(formData.get('price') ?? '')),
      currency: String(formData.get('currency') ?? 'USD'),
      orientation: String(formData.get('orientation') ?? '').trim() || undefined,
      bedrooms: parseInteger(String(formData.get('bedrooms') ?? '')),
      status: normalizeStatus(String(formData.get('status') ?? '')),
    })
  } catch (error) {
    console.error('Error creating unit:', error)
    return { error: 'No se pudo crear la unidad.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/units`)
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { notice: `Unidad ${code} creada.` }
}

export async function updateUnitAction(
  projectId: string,
  unitId: string,
  data: {
    code: string
    floor: string
    m2: string
    price: string
    currency: string
    orientation: string
    bedrooms: string
    status: string
  }
): Promise<UnitActionState> {
  if (!data.code.trim()) return { error: 'El código no puede quedar vacío.' }

  let tenant
  try {
    tenant = await assertProjectAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  try {
    await updateUnit(tenant.tenantId, unitId, {
      code: data.code.trim(),
      floor: parseInteger(data.floor),
      m2: parseDecimal(data.m2),
      price: parseDecimal(data.price),
      currency: data.currency,
      orientation: data.orientation.trim(),
      bedrooms: parseInteger(data.bedrooms),
      status: normalizeStatus(data.status),
    } as any)
  } catch (error) {
    console.error('Error updating unit:', error)
    return { error: 'No se pudo guardar la unidad.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/units`)
  revalidatePath(`/dashboard/projects/${projectId}`)
  return {}
}

export async function deleteUnitAction(
  projectId: string,
  unitId: string
): Promise<UnitActionState> {
  let tenant
  try {
    tenant = await assertProjectAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  try {
    await deleteUnit(tenant.tenantId, unitId)
  } catch (error) {
    console.error('Error deleting unit:', error)
    return { error: 'No se pudo borrar la unidad.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/units`)
  revalidatePath(`/dashboard/projects/${projectId}`)
  return {}
}

/**
 * Bulk import from pasted CSV. Loading an 80-unit tower one form at a time
 * is the main reason unit management was unusable, so this is a first-class
 * path rather than an extra.
 *
 * Expected columns: code, floor, m2, price, orientation, bedrooms, status
 */
export async function importUnitsAction(
  projectId: string,
  _prev: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
  const raw = String(formData.get('csv') ?? '').trim()
  if (!raw) return { error: 'Pegá al menos una fila.' }

  let tenant
  try {
    tenant = await assertProjectAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  // Drop a header row if the first cell is literally "code"/"codigo".
  const firstCell = lines[0]?.split(/[;,\t]/)[0]?.trim().toLowerCase()
  if (firstCell === 'code' || firstCell === 'codigo' || firstCell === 'código') {
    lines.shift()
  }

  if (lines.length === 0) return { error: 'No hay filas para importar.' }
  if (lines.length > 500) {
    return { error: 'Máximo 500 unidades por importación.' }
  }

  const rows: Parameters<typeof createUnit>[2][] = []
  const problems: string[] = []

  lines.forEach((line, i) => {
    const cells = line.split(/[;,\t]/).map((c) => c.trim())
    const code = cells[0]
    if (!code) {
      problems.push(`Fila ${i + 1}: sin código`)
      return
    }
    rows.push({
      code,
      floor: parseInteger(cells[1] ?? ''),
      m2: parseDecimal(cells[2] ?? ''),
      price: parseDecimal(cells[3] ?? ''),
      currency: 'USD',
      orientation: cells[4] || undefined,
      bedrooms: parseInteger(cells[5] ?? ''),
      status: normalizeStatus(cells[6] ?? ''),
    })
  })

  if (rows.length === 0) {
    return { error: `Ninguna fila válida. ${problems.slice(0, 3).join(' · ')}` }
  }

  const limitError = await checkCanCreate(tenant.tenantId, 'unit', rows.length)
  if (limitError) return { error: limitError }

  try {
    // One statement in one transaction: a partial import that leaves half
    // the tower loaded is worse than a clean failure the user can retry.
    await createUnitsBulk(tenant.tenantId, projectId, rows)
  } catch (error) {
    console.error('Error importing units:', error)
    return { error: 'Falló la importación. Revisá el formato de las filas.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/units`)
  revalidatePath(`/dashboard/projects/${projectId}`)

  const skipped = problems.length ? ` (${problems.length} fila(s) salteada(s))` : ''
  return { notice: `${rows.length} unidad(es) importada(s)${skipped}.` }
}
