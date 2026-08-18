'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { createProject } from '@/modules/projects/project-service'

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
