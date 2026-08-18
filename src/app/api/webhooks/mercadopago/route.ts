import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPreapproval } from '@/modules/billing/mercadopago-client'
import { upsertSubscription, getPlanByMpPlanId } from '@/modules/billing/billing-service'

/**
 * Verifies Mercado Pago's `x-signature` header.
 *
 * MP sends `ts=<unix>,v1=<hmac>`; the signed payload is a fixed template
 * built from the resource id, the request id and the timestamp. Without this
 * check anyone could POST a forged "authorized" event and unlock a paid plan.
 */
function verifySignature(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return false

  const signature = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id') ?? ''
  if (!signature) return false

  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k?.trim(), v?.trim()]
    })
  )

  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(v1, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = await request.json().catch(() => ({} as any))

  // MP sends the id either in the body or as a query param depending on the
  // notification flavour.
  const dataId: string | undefined =
    body?.data?.id ?? url.searchParams.get('data.id') ?? body?.id
  const type: string | undefined = body?.type ?? url.searchParams.get('type') ?? undefined

  if (!dataId) {
    return NextResponse.json({ error: 'missing data id' }, { status: 400 })
  }

  if (!verifySignature(request, String(dataId))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // Only subscription events matter here; payment events are acknowledged so
  // Mercado Pago stops retrying them.
  if (type && type !== 'subscription_preapproval') {
    return NextResponse.json({ received: true, ignored: type })
  }

  try {
    // Re-fetch from the API rather than trusting the payload: the
    // notification only tells us something changed, not what it changed to.
    const preapproval = await getPreapproval(String(dataId))

    const tenantId = preapproval.external_reference
    if (!tenantId) {
      console.error('Preapproval sin external_reference:', preapproval.id)
      return NextResponse.json({ received: true, skipped: 'no tenant' })
    }

    const plan = preapproval.preapproval_plan_id
      ? await getPlanByMpPlanId(preapproval.preapproval_plan_id)
      : null

    await upsertSubscription({
      tenantId,
      planId: plan?.id ?? null,
      mpPreapprovalId: preapproval.id,
      status: preapproval.status,
      currentPeriodEnd: preapproval.next_payment_date
        ? new Date(preapproval.next_payment_date)
        : null,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error procesando webhook de Mercado Pago:', error)
    // 500 makes Mercado Pago retry, which is what we want for transient failures.
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}
