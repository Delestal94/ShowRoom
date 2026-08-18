import { randomBytes } from 'node:crypto'
import { invitations, memberships, users, tenants } from '@/server/db/schema'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import { appDb, withTenant, withUser, withInviteToken } from '@/server/db/tenant-db'

import { type InviteRole } from './invitation-constants'

export { INVITE_ROLES, ROLE_LABEL, ROLE_DESCRIPTION } from './invitation-constants'
export type { InviteRole } from './invitation-constants'

const EXPIRY_DAYS = 7

export async function listInvitations(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.invitations.findMany({
      where: eq(invitations.tenantId, tenantId),
      orderBy: desc(invitations.createdAt),
    })
  )
}

export async function createInvitation(
  tenantId: string,
  role: InviteRole,
  label?: string
) {
  // 32 bytes en base64url: suficiente para que el token sea impredecible,
  // que es lo único que protege el acceso al tenant.
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .insert(invitations)
      .values({ tenantId, token, role, label, expiresAt })
      .returning()
    return row
  })
}

export async function revokeInvitation(tenantId: string, invitationId: string) {
  return withTenant(tenantId, (tx) =>
    tx
      .delete(invitations)
      .where(
        and(eq(invitations.id, invitationId), eq(invitations.tenantId, tenantId))
      )
  )
}

export interface InvitationPreview {
  tenantName: string
  role: string
  expired: boolean
  used: boolean
}

/** Lectura pública por token, para mostrar a qué se lo está invitando. */
export async function previewInvitation(
  token: string
): Promise<InvitationPreview | null> {
  const invite = await withInviteToken(token, (tx) =>
    tx.query.invitations.findFirst({ where: eq(invitations.token, token) })
  )
  if (!invite) return null

  const tenant = await withInviteToken(
    token,
    (tx) =>
      tx.query.tenants.findFirst({
        where: eq(tenants.id, invite.tenantId),
        columns: { name: true },
      }),
    invite.tenantId
  )

  return {
    tenantName: tenant?.name ?? 'la inmobiliaria',
    role: invite.role,
    expired: invite.expiresAt.getTime() < Date.now(),
    used: Boolean(invite.acceptedAt),
  }
}

export type AcceptResult =
  | { ok: true; tenantId: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'used' | 'already_member' }

/**
 * Canjea la invitación por una membresía.
 *
 * El usuario que acepta puede no tener fila en `users` todavía (recién se
 * registró), así que se crea si falta. La invitación se marca como usada en
 * la misma transacción que la membresía, para que un doble clic no genere
 * dos membresías.
 */
export async function acceptInvitation(
  token: string,
  authUserId: string,
  email: string
): Promise<AcceptResult> {
  const invite = await withInviteToken(token, (tx) =>
    tx.query.invitations.findFirst({ where: eq(invitations.token, token) })
  )

  if (!invite) return { ok: false, reason: 'not_found' }
  if (invite.acceptedAt) return { ok: false, reason: 'used' }
  if (invite.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' }

  let appUser = await appDb.query.users.findFirst({
    where: eq(users.authUserId, authUserId),
  })

  if (!appUser) {
    const [created] = await appDb
      .insert(users)
      .values({ email, authUserId })
      .returning()
    appUser = created
  }

  const existing = await withUser(appUser.id, (tx) =>
    tx.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, appUser!.id),
        eq(memberships.tenantId, invite.tenantId)
      ),
    })
  )
  if (existing) return { ok: false, reason: 'already_member' }

  const claimed = await withInviteToken(
    token,
    async (tx) => {
      await tx.execute(
        sql`select set_config('app.user_id', ${appUser!.id}, true)`
      )

      // Se reclama la invitación PRIMERO, exigiendo que siga sin usar. Si dos
      // pestañas aceptan a la vez, sólo una actualiza la fila; la otra ve
      // cero filas y no llega a crear una membresía duplicada.
      const claimedRows = await tx
        .update(invitations)
        .set({ acceptedAt: new Date(), acceptedBy: appUser!.id })
        .where(
          and(
            eq(invitations.id, invite.id),
            isNull(invitations.acceptedAt)
          )
        )
        .returning({ id: invitations.id })

      if (claimedRows.length === 0) return false

      await tx.insert(memberships).values({
        userId: appUser!.id,
        tenantId: invite.tenantId,
        role: invite.role,
      })
      return true
    },
    invite.tenantId
  )

  if (!claimed) return { ok: false, reason: 'used' }

  return { ok: true, tenantId: invite.tenantId }
}
