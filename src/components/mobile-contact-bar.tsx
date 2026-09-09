'use client'

import { trackEvent } from '@/lib/analytics'

interface MobileContactBarProps {
  projectSlug: string
  projectName: string
  /** Cuando está, la consulta se atribuye a esta unidad. */
  unitCode?: string
  /** E.164 sin símbolos. Sin número, la barra sólo lleva al formulario. */
  whatsappNumber?: string | null
  /** Ancla del formulario dentro de la misma página. */
  formHref: string
}

/**
 * Barra fija al pie, sólo en mobile. El comprador llega por un link de
 * WhatsApp y decide en el celular: la vía de contacto tiene que estar siempre
 * a mano, sin obligarlo a scrollear de vuelta hasta el formulario.
 */
export function MobileContactBar({
  projectSlug,
  projectName,
  unitCode,
  whatsappNumber,
  formHref,
}: MobileContactBarProps) {
  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        unitCode
          ? `Hola, me interesa la unidad ${unitCode} de ${projectName}.`
          : `Hola, me interesa el proyecto ${projectName}.`
      )}`
    : null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-xl lg:hidden">
      <div className="container-page flex items-center gap-2.5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <a
          href={formHref}
          className="flex h-12 flex-1 items-center justify-center rounded-full border border-border-strong text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          Dejar mis datos
        </a>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent({
                type: 'whatsapp_click',
                projectSlug,
                metadata: { unit_code: unitCode, source: 'mobile_bar' },
              })
            }
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-success text-sm font-semibold text-[#04220f] transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.6 14.2c-.2.7-1.4 1.3-2 1.3-.5 0-1.1.2-3.7-.8-3.1-1.3-5.1-4.5-5.2-4.7-.2-.2-1.3-1.7-1.3-3.2s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l1 2.4c.1.2.1.4 0 .6l-.4.6-.3.3c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l2.2 1c.3.2.5.3.5.4.1.2.1.7-.1 1.4Z" />
            </svg>
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
