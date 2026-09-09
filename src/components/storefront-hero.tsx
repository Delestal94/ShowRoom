'use client'

import { TourViewer } from './tour-viewer'
import { ContactForm } from './contact-form'
import { ButtonLink } from '@/components/ui/button'

interface Tour {
  id: string
  kind: '360' | 'glb-model' | 'drone-video' | 'image'
  cdnUrl?: string
  storageKey: string
  metadataJson?: Record<string, any>
  status: string
}

interface StorefrontHeroProps {
  projectSlug: string
  projectName: string
  projectAddress: string
  tours: Tour[]
  whatsappNumber?: string | null
  availableCount: number
  minPrice: number | null
  currency: string
}

function formatPrice(value: number, currency: string) {
  return `${currency} ${Math.round(value).toLocaleString('es-AR')}`
}

export function StorefrontHero({
  projectSlug,
  projectName,
  projectAddress,
  tours,
  whatsappNumber,
  availableCount,
  minPrice,
  currency,
}: StorefrontHeroProps) {
  const readyTours = tours.filter((t) => t.status === 'ready')
  const hasMedia = readyTours.length > 0

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Hola, me interesa el proyecto ${projectName}.`
      )}`
    : null

  return (
    <section className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-bg">
      {/* Fondo: el recorrido 3D/360°/fotos ocupa toda la sección, borde a borde */}
      <div className="absolute inset-0">
        {hasMedia ? (
          <TourViewer tours={readyTours as any} projectSlug={projectSlug} bleed />
        ) : (
          <div className="grid-lines absolute inset-0 bg-gradient-to-br from-surface via-bg to-surface-2" />
        )}
      </div>

      {/* Legibilidad del texto sobre la imagen: sin esto el título compite
          contra cualquier zona clara de la foto o del modelo 3D. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg/70 to-transparent" />

      {/* Card de contacto flotante — sólo desktop, mobile usa la barra fija
          y la sección de contacto más abajo en el flujo. */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="container-page relative h-full">
          <div className="pointer-events-auto absolute right-5 top-8 w-[22rem]">
            <ContactForm
              projectSlug={projectSlug}
              projectName={projectName}
              whatsappNumber={whatsappNumber}
            />
          </div>
        </div>
      </div>

      {/* Contenido principal: título, dirección, precio y CTAs */}
      <div className="relative flex h-full min-h-[calc(100vh-4rem)] flex-col justify-end">
        <div className="container-page pb-8 sm:pb-12">
          <div className="max-w-2xl">
            {availableCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                {availableCount} {availableCount === 1 ? 'unidad disponible' : 'unidades disponibles'}
              </span>
            )}

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {projectName}
            </h1>

            {projectAddress && (
              <p className="mt-3 flex items-center gap-1.5 text-base text-white/80">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="9.5" r="2.3" />
                </svg>
                {projectAddress}
              </p>
            )}

            {minPrice != null && (
              <p className="mt-2 text-sm text-white/70">
                Desde{' '}
                <span className="font-semibold text-white">{formatPrice(minPrice, currency)}</span>
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href="#unidades" size="lg">
                Ver unidades
              </ButtonLink>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/25 bg-black/30 px-6 text-base font-medium text-white backdrop-blur transition-colors hover:bg-black/45 lg:hidden"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.6 14.2c-.2.7-1.4 1.3-2 1.3-.5 0-1.1.2-3.7-.8-3.1-1.3-5.1-4.5-5.2-4.7-.2-.2-1.3-1.7-1.3-3.2s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l1 2.4c.1.2.1.4 0 .6l-.4.6-.3.3c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l2.2 1c.3.2.5.3.5.4.1.2.1.7-.1 1.4Z" />
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pista de scroll */}
      <a
        href="#unidades"
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-white/60 sm:flex"
      >
        <span className="text-[11px] uppercase tracking-widest">Descubrí más</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  )
}
