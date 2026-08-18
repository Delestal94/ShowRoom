import { plans, subscriptions, projects, units } from '@/server/db/schema'
import { eq, count } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

export interface Plan {
  id: string
  slug: string
  name: string
  unitLimit: number
  projectLimit: number
  priceMonthly: string
  currency: string
  mpPreapprovalPlanId: string | null
  featuresJson: unknown
}

/** The plan a tenant falls back to before subscribing to anything. */
export const FREE_PLAN = {
  slug: 'free',
  name: 'Gratis',
  unitLimit: 10,
  projectLimit: 1,
} as const

/** `plans` is a public catalogue — no RLS, readable without tenant context. */
export async function listPlans(): Promise<Plan[]> {
  return publicDb.query.plans.findMany({
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  }) as Promise<Plan[]>
}

export async function getPlanBySlug(slug: string) {
  return publicDb.query.plans.findFirst({ where: eq(plans.slug, slug) })
}

export interface TenantSubscription {
  planSlug: string
  planName: string
  unitLimit: number
  projectLimit: number
  status: string
  currentPeriodEnd: Date | null
  isActive: boolean
}

/**
 * Resolves the tenant's effective plan. Falls back to the free tier when
 * there's no subscription, or when one exists but isn't authorized — a
 * `pending` subscription must not unlock paid limits.
 */
export async function getTenantSubscription(
  tenantId: string
): Promise<TenantSubscription> {
  const sub = await withTenant(tenantId, (tx) =>
    tx.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    })
  )

  const free: TenantSubscription = {
    planSlug: FREE_PLAN.slug,
    planName: FREE_PLAN.name,
    unitLimit: FREE_PLAN.unitLimit,
    projectLimit: FREE_PLAN.projectLimit,
    status: sub?.status ?? 'none',
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    isActive: false,
  }

  if (!sub || sub.status !== 'authorized' || !sub.planId) return free

  const plan = await publicDb.query.plans.findFirst({
    where: eq(plans.id, sub.planId),
  })
  if (!plan) return free

  return {
    planSlug: plan.slug,
    planName: plan.name,
    unitLimit: plan.unitLimit,
    projectLimit: plan.projectLimit,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    isActive: true,
  }
}

export interface UsageLimits {
  projects: { used: number; limit: number; exceeded: boolean }
  units: { used: number; limit: number; exceeded: boolean }
  planName: string
}

export async function getUsage(tenantId: string): Promise<UsageLimits> {
  const subscription = await getTenantSubscription(tenantId)

  const [projectCount, unitCount] = await withTenant(tenantId, async (tx) => {
    const [p] = await tx
      .select({ n: count() })
      .from(projects)
      .where(eq(projects.tenantId, tenantId))
    const [u] = await tx
      .select({ n: count() })
      .from(units)
      .where(eq(units.tenantId, tenantId))
    return [Number(p?.n ?? 0), Number(u?.n ?? 0)]
  })

  return {
    projects: {
      used: projectCount,
      limit: subscription.projectLimit,
      exceeded: projectCount >= subscription.projectLimit,
    },
    units: {
      used: unitCount,
      limit: subscription.unitLimit,
      exceeded: unitCount >= subscription.unitLimit,
    },
    planName: subscription.planName,
  }
}

/**
 * Guard used before creating projects/units. Returns a user-facing message
 * when the tenant is at its plan's ceiling, or null when there's room.
 */
export async function checkCanCreate(
  tenantId: string,
  what: 'project' | 'unit',
  howMany = 1
): Promise<string | null> {
  const usage = await getUsage(tenantId)

  if (what === 'project') {
    if (usage.projects.used + howMany > usage.projects.limit) {
      return `Tu plan ${usage.planName} permite hasta ${usage.projects.limit} proyecto(s). Actualizá el plan para crear más.`
    }
    return null
  }

  if (usage.units.used + howMany > usage.units.limit) {
    const room = Math.max(0, usage.units.limit - usage.units.used)
    return `Tu plan ${usage.planName} permite hasta ${usage.units.limit} unidades y ya tenés ${usage.units.used}. Podés cargar ${room} más, o actualizar el plan.`
  }
  return null
}

/** Upserts the subscription row for a tenant after a Mercado Pago event. */
export async function upsertSubscription(input: {
  tenantId: string
  planId: string | null
  mpPreapprovalId: string
  status: string
  currentPeriodEnd?: Date | null
}) {
  return withTenant(input.tenantId, async (tx) => {
    const existing = await tx.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, input.tenantId),
    })

    if (existing) {
      const [updated] = await tx
        .update(subscriptions)
        .set({
          planId: input.planId ?? existing.planId,
          mpPreapprovalId: input.mpPreapprovalId,
          status: input.status,
          currentPeriodEnd: input.currentPeriodEnd ?? existing.currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.tenantId, input.tenantId))
        .returning()
      return updated
    }

    const [created] = await tx
      .insert(subscriptions)
      .values({
        tenantId: input.tenantId,
        planId: input.planId,
        mpPreapprovalId: input.mpPreapprovalId,
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
      })
      .returning()
    return created
  })
}

/**
 * Maps a Mercado Pago preapproval_plan_id back to our plan row. Used by the
 * webhook, which only learns the plan through the notification payload.
 */
export async function getPlanByMpPlanId(mpPlanId: string) {
  return publicDb.query.plans.findFirst({
    where: eq(plans.mpPreapprovalPlanId, mpPlanId),
  })
}
