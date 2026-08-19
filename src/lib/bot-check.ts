/**
 * Detección de bots sin CAPTCHA.
 *
 * Un CAPTCHA de terceros agrega una dependencia externa, un costo y fricción
 * para el comprador legítimo — que es justamente a quien no queremos
 * molestar. Estas dos señales atrapan a la mayoría de los bots de formulario
 * sin que una persona real note nada.
 */

export interface BotSignals {
  /** Campo trampa: invisible para humanos, tentador para un bot. */
  honeypot?: string
  /** Marca de tiempo en que se renderizó el formulario. */
  renderedAt?: string
}

export type BotVerdict = { bot: true; reason: string } | { bot: false }

/** Menos de esto es imposible para alguien que realmente lee y escribe. */
const MIN_SECONDS = 3

/** Un formulario abierto hace más de esto probablemente sea un replay. */
const MAX_SECONDS = 60 * 60 * 6

export function detectBot(signals: BotSignals): BotVerdict {
  // Un humano nunca ve el campo, así que nunca lo completa.
  if (signals.honeypot && signals.honeypot.trim()) {
    return { bot: true, reason: 'honeypot' }
  }

  const rendered = Number(signals.renderedAt)
  if (Number.isFinite(rendered) && rendered > 0) {
    const elapsed = (Date.now() - rendered) / 1000

    if (elapsed < MIN_SECONDS) {
      return { bot: true, reason: 'too_fast' }
    }
    if (elapsed > MAX_SECONDS) {
      return { bot: true, reason: 'stale' }
    }
  }

  return { bot: false }
}
