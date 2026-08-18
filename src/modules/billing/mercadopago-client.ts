/**
 * Mercado Pago subscriptions (preapproval) client.
 *
 * Stripe doesn't operate in Argentina, so billing runs through Mercado Pago's
 * preapproval API: a `preapproval_plan` describes the recurring charge, and a
 * `preapproval` is one tenant's subscription to it.
 *
 * Uses fetch directly rather than the SDK — we need three endpoints, and the
 * SDK pulls in a large dependency for what amounts to typed HTTP calls.
 */

const API = 'https://api.mercadopago.com'

function accessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN no está configurada')
  return token
}

async function mpFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const { idempotencyKey, ...rest } = init

  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      ...rest.headers,
    },
    cache: 'no-store',
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    const detail = (body as any)?.message ?? (body as any)?.error ?? res.statusText
    throw new Error(`Mercado Pago ${res.status}: ${detail}`)
  }

  return body as T
}

export interface PreapprovalPlan {
  id: string
  reason: string
  init_point: string
  status: string
}

export interface Preapproval {
  id: string
  status: 'pending' | 'authorized' | 'paused' | 'cancelled'
  preapproval_plan_id?: string
  external_reference?: string
  payer_email?: string
  init_point?: string
  next_payment_date?: string
  auto_recurring?: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
    end_date?: string
  }
}

/**
 * Creates the recurring plan on Mercado Pago's side. Run once per plan; the
 * returned id is stored in `plans.mp_preapproval_plan_id`.
 */
export async function createPreapprovalPlan(input: {
  reason: string
  amount: number
  currency?: string
  backUrl: string
}): Promise<PreapprovalPlan> {
  return mpFetch<PreapprovalPlan>('/preapproval_plan', {
    method: 'POST',
    body: JSON.stringify({
      reason: input.reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: input.amount,
        currency_id: input.currency ?? 'ARS',
      },
      back_url: input.backUrl,
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
      },
    }),
  })
}

/**
 * Starts a subscription. Returns an `init_point` URL to redirect the payer to;
 * the subscription stays `pending` until they authorize it there.
 *
 * `externalReference` carries our tenant id so the webhook can match the
 * subscription back without a lookup table.
 */
export async function createPreapproval(input: {
  preapprovalPlanId: string
  payerEmail: string
  externalReference: string
  backUrl: string
}): Promise<Preapproval> {
  return mpFetch<Preapproval>('/preapproval', {
    method: 'POST',
    idempotencyKey: `sub-${input.externalReference}-${input.preapprovalPlanId}`,
    body: JSON.stringify({
      preapproval_plan_id: input.preapprovalPlanId,
      payer_email: input.payerEmail,
      external_reference: input.externalReference,
      back_url: input.backUrl,
    }),
  })
}

export async function getPreapproval(id: string): Promise<Preapproval> {
  return mpFetch<Preapproval>(`/preapproval/${id}`)
}

export async function cancelPreapproval(id: string): Promise<Preapproval> {
  return mpFetch<Preapproval>(`/preapproval/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' }),
  })
}

export function isConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN)
}
