import { describe, expect, it } from 'vitest'
import { detectBot } from './bot-check'

describe('detectBot', () => {
  it('flags a filled honeypot regardless of timing', () => {
    const verdict = detectBot({
      honeypot: 'spam',
      renderedAt: String(Date.now() - 10_000),
    })
    expect(verdict).toEqual({ bot: true, reason: 'honeypot' })
  })

  it('lets a real submission through: honeypot empty, rendered a few seconds ago', () => {
    const verdict = detectBot({
      honeypot: '',
      renderedAt: String(Date.now() - 5_000),
    })
    expect(verdict).toEqual({ bot: false })
  })

  it('flags a submission faster than MIN_SECONDS as a bot', () => {
    const verdict = detectBot({ renderedAt: String(Date.now() - 500) })
    expect(verdict).toEqual({ bot: true, reason: 'too_fast' })
  })

  it('flags a submission older than MAX_SECONDS as stale', () => {
    const sevenHoursAgo = Date.now() - 7 * 60 * 60 * 1000
    const verdict = detectBot({ renderedAt: String(sevenHoursAgo) })
    expect(verdict).toEqual({ bot: true, reason: 'stale' })
  })

  it('does not flag when renderedAt is missing entirely (no timing signal)', () => {
    expect(detectBot({})).toEqual({ bot: false })
  })

  it('does not flag on a non-numeric renderedAt (ignores the invalid signal)', () => {
    expect(detectBot({ renderedAt: 'not-a-timestamp' })).toEqual({ bot: false })
  })
})
