import { createHmac } from 'node:crypto'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { verifySignature } from './verify-mp-signature'

const SECRET = 'test-secret'
const DATA_ID = 'preapproval-123'
const REQUEST_ID = 'req-456'

function signedRequest(overrides?: {
  ts?: string
  v1?: string
  requestId?: string | null
  dataId?: string
}) {
  const ts = overrides?.ts ?? String(Math.floor(Date.now() / 1000))
  const requestId = overrides?.requestId ?? REQUEST_ID
  const manifest = `id:${overrides?.dataId ?? DATA_ID};request-id:${requestId ?? ''};ts:${ts};`
  const v1 = overrides?.v1 ?? createHmac('sha256', SECRET).update(manifest).digest('hex')

  const headers = new Headers()
  headers.set('x-signature', `ts=${ts},v1=${v1}`)
  if (requestId !== null) headers.set('x-request-id', requestId)

  return new Request('https://example.com/api/webhooks/mercadopago', { headers })
}

describe('verifySignature', () => {
  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = SECRET
  })

  afterEach(() => {
    delete process.env.MP_WEBHOOK_SECRET
  })

  it('accepts a correctly computed signature', () => {
    expect(verifySignature(signedRequest(), DATA_ID)).toBe(true)
  })

  it('rejects a tampered dataId', () => {
    const req = signedRequest()
    expect(verifySignature(req, 'a-different-id')).toBe(false)
  })

  it('rejects a tampered v1', () => {
    const req = signedRequest({ v1: 'a'.repeat(64) })
    expect(verifySignature(req, DATA_ID)).toBe(false)
  })

  it('rejects a tampered ts (signature no longer matches the manifest)', () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const staleTs = String(Number(ts) - 1)
    // v1 is computed for `ts`, but the header claims `staleTs`.
    const manifest = `id:${DATA_ID};request-id:${REQUEST_ID};ts:${ts};`
    const v1 = createHmac('sha256', SECRET).update(manifest).digest('hex')
    const headers = new Headers()
    headers.set('x-signature', `ts=${staleTs},v1=${v1}`)
    headers.set('x-request-id', REQUEST_ID)
    const req = new Request('https://example.com', { headers })

    expect(verifySignature(req, DATA_ID)).toBe(false)
  })

  it('rejects a missing x-signature header', () => {
    const req = new Request('https://example.com')
    expect(verifySignature(req, DATA_ID)).toBe(false)
  })

  it('rejects a header missing ts or v1', () => {
    const headers = new Headers()
    headers.set('x-signature', 'v1=deadbeef')
    const req = new Request('https://example.com', { headers })
    expect(verifySignature(req, DATA_ID)).toBe(false)
  })

  it('fails closed when MP_WEBHOOK_SECRET is not configured', () => {
    delete process.env.MP_WEBHOOK_SECRET
    expect(verifySignature(signedRequest(), DATA_ID)).toBe(false)
  })

  it('does not throw on a malformed (non-hex or wrong-length) v1', () => {
    const req = signedRequest({ v1: 'not-hex-and-too-short' })
    expect(() => verifySignature(req, DATA_ID)).not.toThrow()
    expect(verifySignature(req, DATA_ID)).toBe(false)
  })
})
