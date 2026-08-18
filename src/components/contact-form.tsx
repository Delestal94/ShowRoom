'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics'

interface ContactFormProps {
  projectSlug: string
  projectName: string
  /** When present, the enquiry is attributed to this unit. */
  unitCode?: string
  /** E.164 without symbols, e.g. 5491122334455. Hides the button when absent. */
  whatsappNumber?: string | null
}

const inputCls =
  'h-11 w-full rounded-md border border-border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'

export function ContactForm({
  projectSlug,
  projectName,
  unitCode,
  whatsappNumber,
}: ContactFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/projects/${projectSlug}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Prepending the unit keeps the context in the lead even though
          // leads aren't linked to units in the schema yet.
          message: unitCode
            ? `[Unidad ${unitCode}] ${form.message}`.trim()
            : form.message,
          unitCode,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'No pudimos enviar tu consulta. Probá de nuevo.')
        return
      }

      setSuccess(true)
      trackEvent({
        type: 'contact_form_submit',
        projectSlug,
        metadata: { source: 'storefront', unit_code: unitCode },
      })
    } catch {
      setError('No pudimos enviar tu consulta. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/5 p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-success/40 bg-success/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-success" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h3 className="mt-4 font-semibold text-fg">Consulta enviada</h3>
        <p className="mt-1.5 text-sm text-fg-muted">
          Te vamos a contactar a la brevedad.
        </p>
      </div>
    )
  }

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        unitCode
          ? `Hola, me interesa la unidad ${unitCode} de ${projectName}.`
          : `Hola, me interesa el proyecto ${projectName}.`
      )}`
    : null

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur">
      <h3 className="font-semibold text-fg">
        {unitCode ? `¿Te interesa la ${unitCode}?` : '¿Te interesa?'}
      </h3>
      <p className="mt-1 text-sm text-fg-muted">
        Dejanos tus datos y te contactamos con toda la información.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="cf-name" className="mb-1.5 block text-sm font-medium text-fg">
            Nombre
          </label>
          <input
            id="cf-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Tu nombre"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="cf-email" className="mb-1.5 block text-sm font-medium text-fg">
            Email
          </label>
          <input
            id="cf-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="vos@email.com"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="cf-phone" className="mb-1.5 block text-sm font-medium text-fg">
            Teléfono
          </label>
          <input
            id="cf-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="11 2233-4455"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="cf-msg" className="mb-1.5 block text-sm font-medium text-fg">
            Mensaje <span className="font-normal text-fg-subtle">(opcional)</span>
          </label>
          <textarea
            id="cf-msg"
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Contanos qué estás buscando…"
            className="w-full rounded-md border border-border bg-surface-2/60 p-3.5 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Enviando…' : 'Enviar consulta'}
        </Button>

        <p className="text-center text-xs text-fg-subtle">
          No compartimos tus datos con nadie.
        </p>
      </form>

      {waHref && (
        <div className="mt-5 border-t border-border pt-5">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent({
                type: 'whatsapp_click',
                projectSlug,
                metadata: { unit_code: unitCode },
              })
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-success/40 bg-success/10 text-sm font-medium text-success transition-colors hover:bg-success/20"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.6 14.2c-.2.7-1.4 1.3-2 1.3-.5 0-1.1.2-3.7-.8-3.1-1.3-5.1-4.5-5.2-4.7-.2-.2-1.3-1.7-1.3-3.2s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l1 2.4c.1.2.1.4 0 .6l-.4.6-.3.3c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l2.2 1c.3.2.5.3.5.4.1.2.1.7-.1 1.4Z" />
            </svg>
            Consultar por WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}
