import { headers } from 'next/headers'
import Stripe from 'stripe'
import { publicDb as db } from '@/server/db/tenant-db'
import { eq } from 'drizzle-orm'
import { subscriptions } from '@/server/db/schema'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')!

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Find tenant by stripe subscription id and update
        await db
          .update(subscriptions)
          .set({
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await db
          .update(subscriptions)
          .set({ status: 'canceled' })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

        break
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge
        console.error('Charge failed:', charge.id)
        break
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return Response.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}
