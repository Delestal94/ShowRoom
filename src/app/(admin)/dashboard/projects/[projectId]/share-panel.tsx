'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the text is still selectable.
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-md border border-border bg-surface px-4 py-2.5 font-mono text-xs text-fg">
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
          {copied ? 'Copiado ✓' : 'Copiar'}
        </Button>
      </div>
    </div>
  )
}

export function SharePanel({
  publicUrl,
  qrUrl,
  slug,
  published,
}: {
  publicUrl: string
  qrUrl: string
  slug: string
  published: boolean
}) {
  const [tab, setTab] = useState<'link' | 'qr' | 'embed'>('link')

  const embedCode = `<iframe src="${publicUrl}?embed=1" width="100%" height="800" style="border:0;border-radius:16px" loading="lazy" title="${slug}"></iframe>`

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <h3 className="font-semibold text-fg">Compartir</h3>
      <p className="mt-1 text-sm text-fg-muted">
        {published
          ? 'Mandalo por WhatsApp, ponelo en tu web o imprimí el QR para el cartel de obra.'
          : 'El proyecto está en borrador: estos links no van a funcionar hasta que lo publiques.'}
      </p>

      <div className="mt-5 inline-flex gap-1 rounded-full border border-border p-1">
        {(
          [
            ['link', 'Link'],
            ['qr', 'QR'],
            ['embed', 'Embeber'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors',
              tab === value ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'link' && <CopyField label="Dirección pública" value={publicUrl} />}

        {tab === 'qr' && (
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            {/* Plain <img>: the endpoint generates the PNG on the fly, so
                there's nothing for next/image to optimise. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${qrUrl}?size=320`}
              alt="Código QR del proyecto"
              width={160}
              height={160}
              className="rounded-md border border-border bg-white p-2"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg-muted">
                Apunta a la página pública. Descargalo en alta resolución para imprimir.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`${qrUrl}?size=1200`}
                  download={`qr-${slug}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center rounded-full border border-border-strong px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
                >
                  Descargar PNG
                </a>
              </div>
            </div>
          </div>
        )}

        {tab === 'embed' && (
          <div className="space-y-3">
            <CopyField label="Código para tu sitio" value={embedCode} />
            <p className="text-xs text-fg-subtle">
              El modo embebido oculta el pie de ShowRoom para que el visitante no se vaya de tu
              página. Sirve también para pantallas táctiles en el showroom.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
