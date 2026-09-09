import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verifies Mercado Pago's `x-signature` header.
 *
 * MP sends `ts=<unix>,v1=<hmac>`; the signed payload is a fixed template
 * built from the resource id, the request id and the timestamp. Without this
 * check anyone could POST a forged "authorized" event and unlock a paid plan.
 */
export function verifySignature(req: Request, dataId: string): boolean {
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
