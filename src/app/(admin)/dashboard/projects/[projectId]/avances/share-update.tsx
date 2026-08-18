'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'

export interface Contact {
  id: string
  name: string
  phone: string | null
  status: string
}

/**
 * Difundir un avance sin depender de un proveedor de mail.
 *
 * No se puede automatizar el envío masivo por WhatsApp sin la Cloud API
 * (que requiere cuenta de empresa verificada), así que esto arma el mensaje
 * y abre un chat por contacto. Para una lista de decenas es más rápido que
 * escribirlo a mano, y no cuesta nada.
 */
export function ShareUpdatePanel({
  title,
  body,
  progressPercent,
  projectName,
  publicUrl,
  contacts,
}: {
  title: string
  body: string | null
  progressPercent: number | null
  projectName: string
  publicUrl: string
  contacts: Contact[]
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState<Set<string>>(new Set())

  const message = [
    `*${projectName}* — ${title}`,
    typeof progressPercent === 'number' ? `Avance de obra: ${progressPercent}%` : null,
    body || null,
    publicUrl,
  ]
    .filter(Boolean)
    .join('\n\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard bloqueado — el texto sigue visible para seleccionar.
    }
  }

  const withPhone = contacts.filter((c) => c.phone && c.phone.replace(/\D/g, '').length >= 8)

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Compartir
      </Button>
    )
  }

  return (
    <div className="mt-4 w-full rounded-md border border-border bg-surface-2/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-fg">Compartir este avance</h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-fg-subtle hover:text-fg"
        >
          Cerrar
        </button>
      </div>

      <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-xs text-fg-muted">
        {message}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copiado ✓' : 'Copiar mensaje'}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-full border border-success/40 bg-success/10 px-4 text-sm font-medium text-success transition-colors hover:bg-success/20"
        >
          Abrir WhatsApp
        </a>
      </div>

      {withPhone.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            Enviar a interesados ({withPhone.length})
          </p>
          <p className="mt-1 text-xs text-fg-subtle">
            Se marcan al abrir, para que no pierdas la cuenta de a quién ya le escribiste.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {withPhone.map((c) => (
              <a
                key={c.id}
                href={`https://wa.me/${c.phone!.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSent((prev) => new Set(prev).add(c.id))}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                  sent.has(c.id)
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
                )}
              >
                {sent.has(c.id) && <span aria-hidden>✓</span>}
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
