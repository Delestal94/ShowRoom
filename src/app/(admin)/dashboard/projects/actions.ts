'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { invalidateProject } from '@/modules/public/cached-storefront'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from '@/modules/projects/project-service'
import { listUnitsByProject } from '@/modules/units/unit-service'
import { listToursByProject } from '@/modules/tours/tour-service'
import { checkCanCreate } from '@/modules/billing/billing-service'

export interface CreateProjectState {
  error?: string
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Splits user-entered text into trimmed, non-empty lines. */
function toLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.replace('\r', '').trim())
    .filter(Boolean)
}

/** Accepts "-34.6037, -58.3816" (comma and/or whitespace separated). */
function parseCoords(raw: string): { lat: number; lng: number } | null {
  const cleaned = raw.trim()
  if (!cleaned) return null

  const parts = cleaned.split(/[,\s]+/).filter(Boolean)
  if (parts.length !== 2) return null

  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

/** One point of interest per line: "Subte línea B — 300 m" */
function parsePointsOfInterest(raw: string) {
  return toLines(raw)
    .slice(0, 20)
    .map((line) => {
      const separator = line.search(/\s[—–-]\s/)
      if (separator === -1) return { name: line, distance: undefined }
      return {
        name: line.slice(0, separator).trim(),
        distance: line.slice(separator + 3).trim() || undefined,
      }
    })
    .filter((p) => p.name)
}

export async function createProjectAction(
  _prev: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const rawSlug = String(formData.get('slug') ?? '').trim()

  if (!name) {
    return { error: 'Ponele un nombre al proyecto.' }
  }

  const slug = slugify(rawSlug || name)
  if (!slug) {
    return { error: 'El slug quedó vacío. Usá letras o números.' }
  }

  const tenant = await requireCurrentTenant()

  const limitError = await checkCanCreate(tenant.tenantId, 'project')
  if (limitError) return { error: limitError }

  let projectId: string
  try {
    const project = await createProject(tenant.tenantId, { name, address, slug })
    projectId = project.id
  } catch (error: any) {
    // Postgres unique_violation on the slug column.
    if (error?.code === '23505') {
      return { error: 'Ya existe un proyecto con ese slug. Probá con otro.' }
    }
    console.error('Error creating project:', error)
    return { error: 'No se pudo crear el proyecto. Intentá de nuevo.' }
  }

  revalidatePath('/dashboard/projects')
  redirect(`/dashboard/projects/${projectId}`)
}

export async function updateProjectAction(
  projectId: string,
  _prev: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const rawSlug = String(formData.get('slug') ?? '').trim()
  const rawCoords = String(formData.get('coords') ?? '')
  const rawPoi = String(formData.get('pointsOfInterest') ?? '')

  if (!name) return { error: 'Ponele un nombre al proyecto.' }

  const slug = slugify(rawSlug || name)
  if (!slug) return { error: 'El slug quedó vacío. Usá letras o números.' }

  const geo = parseCoords(rawCoords)
  if (rawCoords.trim() && !geo) {
    return {
      error:
        'Revisá las coordenadas: se esperan latitud y longitud separadas por coma. Ej: -34.6037, -58.3816',
    }
  }

  const tenant = await requireCurrentTenant()
  const existing = await getProject(tenant.tenantId, projectId)
  if (!existing) return { error: 'No tenés acceso a este proyecto.' }

  try {
    await updateProject(tenant.tenantId, projectId, {
      name,
      slug,
      address,
      geo,
      pointsOfInterest: parsePointsOfInterest(rawPoi),
    })
  } catch (error: any) {
    if (error?.code === '23505') {
      return { error: 'Ya existe un proyecto con ese slug. Probá con otro.' }
    }
    console.error('Error updating project:', error)
    return { error: 'No se pudo guardar el proyecto.' }
  }

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)

  // Si el slug cambió hay que tirar las dos entradas: la vieja seguiría
  // sirviendo el proyecto desde caché en una URL que ya no le corresponde.
  invalidateProject(slug)
  if (existing.slug !== slug) invalidateProject(existing.slug)

  redirect(`/dashboard/projects/${projectId}`)
}

/**
 * Toggles draft ↔ published.
 *
 * Publishing with nothing to show would put a blank page behind a link the
 * user is about to share, so that specific case is blocked with an
 * explanation rather than silently allowed.
 */
export async function toggleProjectStatusAction(
  projectId: string
): Promise<CreateProjectState> {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) return { error: 'No tenés acceso a este proyecto.' }

  const nextStatus = project.status === 'published' ? 'draft' : 'published'

  if (nextStatus === 'published') {
    const [units, tours] = await Promise.all([
      listUnitsByProject(tenant.tenantId, projectId),
      listToursByProject(tenant.tenantId, projectId),
    ])
    if (units.length === 0 && tours.length === 0) {
      return {
        error:
          'Cargá al menos una unidad o subí un tour antes de publicar — si no, la página pública queda vacía.',
      }
    }
  }

  try {
    await updateProject(tenant.tenantId, projectId, { status: nextStatus })
  } catch (error) {
    console.error('Error toggling project status:', error)
    return { error: 'No se pudo cambiar el estado del proyecto.' }
  }

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)
  invalidateProject(project.slug)
  return {}
}

export async function deleteProjectAction(
  projectId: string
): Promise<CreateProjectState> {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) return { error: 'No tenés acceso a este proyecto.' }

  try {
    await deleteProject(tenant.tenantId, projectId)
  } catch (error) {
    console.error('Error deleting project:', error)
    return { error: 'No se pudo borrar el proyecto.' }
  }

  // Sin esto la página seguiría sirviéndose desde caché después de borrada.
  invalidateProject(project.slug)
  revalidatePath('/dashboard/projects')
  redirect('/dashboard/projects')
}
