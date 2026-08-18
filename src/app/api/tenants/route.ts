import { getUser } from '@/lib/supabase/server'
import { db } from '@/server/db/client'
import { tenants, subscriptions } from '@/server/db/schema'

export async function POST(request: Request) {
  const user = await getUser()

  if (!user) {
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

    // TODO: Validate plan exists when planId is provided
    // For now, we'll just create the tenant and subscription

    // Create tenant
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name,
        slug: slug.toLowerCase(),
      })
      .returning()

    // Create subscription with the selected plan
    if (planId) {
      await db.insert(subscriptions).values({
        tenantId: newTenant.id,
        planId,
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
