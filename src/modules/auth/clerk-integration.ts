import { auth } from '@clerk/nextjs/server'
import { db } from '@/server/db/client'
import { eq, and } from 'drizzle-orm'
import { users, memberships } from '@/server/db/schema'

export async function getCurrentUser() {
  const { userId, sessionId } = await auth()

  if (!userId) {
    return null
  }

  return { userId, sessionId }
}

export async function ensureUserExists(clerkUserId: string, email: string) {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  })

  if (existingUser) {
    return existingUser
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      clerkUserId,
    })
    .returning()

  return newUser
}

export async function getUserMemberships(userId: string, tenantId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, userId),
      eq(memberships.tenantId, tenantId)
    ),
  })

  return membership
}

export async function createMembership(
  userId: string,
  tenantId: string,
  role: string
) {
  const [membership] = await db
    .insert(memberships)
    .values({
      userId,
      tenantId,
      role,
    })
    .returning()

  return membership
}

// Invite user to tenant (via Clerk Organizations in production)
export async function inviteUserToTenant(
  tenantId: string,
  email: string,
  role: string
) {
  // For MVP: just create membership if user exists
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (!user) {
    throw new Error(`User ${email} not found. They must sign up first.`)
  }

  return createMembership(user.id, tenantId, role)
}
