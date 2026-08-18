'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getUser } from '@/lib/supabase/server'
import { getProject } from '@/modules/projects/project-service'
import { listLeadsByProject } from '@/modules/leads/lead-service'
import { getSiteUrl } from '@/lib/site-url'
import {
  createUpdate,
  getUpdate,
  togglePublishUpdate,
  deleteUpdate,
  markNotified,
} from '@/modules/construction/construction-service'
import { send, buildProgressEmail, isEmailConfigured } from '@/modules/notifications/email'

export interface UpdateState {
  error?: string
  notice?: string
}

function parsePercent(raw: string): number | undefined {
  const value = raw.trim()
  if (!value) return undefined
  const n = Number.parseInt(value.replace('%', ''), 10)
  if (!Number.isFinite(n)) return undefined
  return Math.min(100, Math.max(0, n))
}

async function assertAccess(projectId: string) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, projectId)
  if (!project) throw new Error('NOT_FOUND')
  return { tenant, project }
}

export async function createUpdateAction(
  projectId: string,
  _prev: UpdateState,
  formData: FormData
): Promise<UpdateState> {
  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { error: 'Ponele un título al avance.' }

  const body = String(formData.get('body') ?? '').trim()
  const progressPercent = parsePercent(String(formData.get('progress') ?? ''))
  const publish = formData.get('publish') === 'on'

  // Las imágenes ya se subieron al storage desde el navegador; acá sólo
  // llegan sus URLs.
  let images: { storageKey: string; cdnUrl: string }[] = []
  try {
    const raw = String(formData.get('images') ?? '[]')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) images = parsed.slice(0, 12)
  } catch {
    images = []
  }

  let ctx
  try {
    ctx = await assertAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  try {
    await createUpdate(ctx.tenant.tenantId, projectId, {
      title,
      body,
      progressPercent,
      images,
      publish,
    })
  } catch (error) {
    console.error('Error creating construction update:', error)
    return { error: 'No se pudo guardar el avance.' }
  }

  revalidatePath(`/dashboard/projects/${projectId}/avances`)
  revalidatePath(`/${ctx.project.slug}`)
  return {
    notice: publish
      ? 'Avance publicado. Ya se ve en la página del proyecto.'
      : 'Avance guardado como borrador.',
  }
}

export async function togglePublishAction(
  projectId: string,
  updateId: string
): Promise<UpdateState> {
  let ctx
  try {
    ctx = await assertAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  const row = await togglePublishUpdate(ctx.tenant.tenantId, updateId)
  if (!row) return { error: 'No encontramos ese avance.' }

  revalidatePath(`/dashboard/projects/${projectId}/avances`)
  revalidatePath(`/${ctx.project.slug}`)
  return {}
}

export async function deleteUpdateAction(
  projectId: string,
  updateId: string
): Promise<UpdateState> {
  let ctx
  try {
    ctx = await assertAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  await deleteUpdate(ctx.tenant.tenantId, updateId)
  revalidatePath(`/dashboard/projects/${projectId}/avances`)
  revalidatePath(`/${ctx.project.slug}`)
  return {}
}

/**
 * Avisa por mail a quienes consultaron por el proyecto.
 *
 * Se manda sólo a los leads activos: alguien marcado como perdido pidió
 * implícitamente dejar de recibir novedades, y los ganados ya compraron.
 */
export async function notifyUpdateAction(
  projectId: string,
  updateId: string
): Promise<UpdateState> {
  let ctx
  try {
    ctx = await assertAccess(projectId)
  } catch {
    return { error: 'No tenés acceso a este proyecto.' }
  }

  if (!isEmailConfigured()) {
    return {
      error:
        'Falta configurar el envío de mails (RESEND_API_KEY y RESEND_FROM). El avance ya está publicado igual.',
    }
  }

  const update = await getUpdate(ctx.tenant.tenantId, updateId)
  if (!update) return { error: 'No encontramos ese avance.' }
  if (!update.publishedAt) {
    return { error: 'Publicá el avance antes de avisar — el mail linkea a la página pública.' }
  }
  if (update.notifiedAt) {
    return { error: 'Este avance ya se notificó.' }
  }

  const leads = await listLeadsByProject(ctx.tenant.tenantId, projectId)
  const recipients = Array.from(
    new Set(
      leads
        .filter((l) => l.status !== 'lost' && l.status !== 'won')
        .map((l) => l.email)
        .filter((e): e is string => Boolean(e))
    )
  )

  if (recipients.length === 0) {
    return { error: 'No hay leads activos con email para avisar.' }
  }

  const images = (update.imagesJson ?? []) as { cdnUrl: string }[]
  const publicUrl = new URL(`/${ctx.project.slug}`, getSiteUrl()).toString()

  // El remitente tiene que ser una dirección del dominio verificado, pero
  // las respuestas deben llegar a una bandeja real: si alguien contesta
  // "me interesa la 8B", eso no puede caer en el vacío.
  const account = await getUser()

  const result = await send({
    to: recipients,
    replyTo: account?.email ?? undefined,
    subject: `${ctx.project.name}: ${update.title}`,
    html: buildProgressEmail({
      projectName: ctx.project.name,
      title: update.title,
      body: update.body,
      progressPercent: update.progressPercent,
      publicUrl,
      imageUrl: images[0]?.cdnUrl,
    }),
  })

  if (result.error) {
    console.error('Error enviando avance:', result.error)
    return { error: 'No se pudieron enviar los mails. Probá de nuevo en unos minutos.' }
  }

  await markNotified(ctx.tenant.tenantId, updateId)
  revalidatePath(`/dashboard/projects/${projectId}/avances`)

  return { notice: `Aviso enviado a ${result.sent} contacto(s).` }
}
