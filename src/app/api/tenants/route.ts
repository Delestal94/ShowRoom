import { auth } from '@clerk/nextjs/server'
import { db } from '@/server/db/client'
import { tenants, subscriptions, plans } from '@/server/db/schema'

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only super admins can create tenants via API
  // In production, this would be validated against global_role
  // For now, we'll allow for testing

  try {
    const { name, slug, planId } = await request.json()

    if (!name || !slug) {
      return Response.json(
        { error: 'Missing required fields: name, slug' },
        { status: 400 }
      )
    }

    // Get plan
    const plan = planId
      ? await db.query.plans.findFirst({
          where: (p) => p.id === planId,
        })
      : null

    // Create tenant
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name,
        slug: slug.toLowerCase(),
      })
      .returning()

    // Create subscription with the selected plan
    if (plan) {
      await db.insert(subscriptions).values({
        tenantId: newTenant.id,
        planId: plan.id,
        status: 'active',
      })
    }

    return Response.json({
      tenant: newTenant,
      message: 'Tenant created successfully',
    })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return Response.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
