'use client'

import { useRef, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { createInviteAction, revokeInviteAction, type InviteState } from './invite-actions'
import { INVITE_ROLES, ROLE_LABEL, ROLE_DESCRIPTION } from '@/modules/tenancy/invitation-constants'

export interface InviteRow {
  id: string
  token: string
  role: string
  label: string | null
  expiresAt: Date | string
  acceptedAt: Date | string | null
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creando…' : 'Crear invitación'}
    </Button>
  )
}

function InviteActions({ invite, url }: { invite: InviteRow; url: string }) {
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const accepted = Boolean(invite.acceptedAt)
  const expired = new Date(invite.expiresAt).getTime() < Date.now()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Portapapeles bloqueado.
    }
  }

  return (
    <div className="flex shrink-0 gap-1">
      {!accepted && !expired && (
        <>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? 'Copiado ✓' : 'Copiar link'}
          </Button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Te invito a gestionar los proyectos en ShowRoom: ${url}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-success/40 bg-success/10 px-4 text-sm font-medium text-success transition-colors hover:bg-success/20"
          >
            WhatsApp
          </a>
        </>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => startTransition(async () => { await revokeInviteAction(invite.id) })}
      >
        {accepted ? 'Quitar' : 'Revocar'}
      </Button>
    </div>
  )
}

export function InvitationsPanel({
  invites,
  baseUrl,
  isAdmin,
}: {
  invites: InviteRow[]
  baseUrl: string
  isAdmin: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState<InviteState, FormData>(
    async (prev, formData) => {
      const result = await createInviteAction(prev, formData)
      if (!result.error) formRef.current?.reset()
      return result
    },
    {}
  )

  if (!isAdmin) {
    return (
      <p className="text-sm text-fg-muted">
        Sólo un administrador puede invitar gente al equipo.
      </p>
    )
  }

  return (
    <div>
      <form ref={formRef} action={formAction} className="space-y-3">
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.notice && <p className="text-sm text-success">{state.notice}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="label"
            placeholder="Para quién es (opcional)"
            className="h-11 flex-1 rounded-md border border-border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          <select
            name="role"
            defaultValue="editor"
            className="h-11 rounded-md border border-border bg-surface-2/60 px-3 text-sm text-fg focus:border-primary focus:outline-none"
          >
            {INVITE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <SubmitButton />
        </div>

        <ul className="space-y-1 text-xs text-fg-subtle">
          {INVITE_ROLES.map((r) => (
            <li key={r}>
              <span className="font-medium text-fg-muted">{ROLE_LABEL[r]}:</span>{' '}
              {ROLE_DESCRIPTION[r]}
            </li>
          ))}
        </ul>
      </form>

      {invites.length > 0 && (
        <div className="mt-6 space-y-2 border-t border-border pt-6">
          {invites.map((invite) => {
            const url = `${baseUrl}/invitacion/${invite.token}`
            const accepted = Boolean(invite.acceptedAt)
            const expired = new Date(invite.expiresAt).getTime() < Date.now()

            return (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">
                    {invite.label || 'Sin nombre'}{' '}
                    <span className="font-normal text-fg-subtle">
                      · {ROLE_LABEL[invite.role] ?? invite.role}
                    </span>
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-xs',
                      accepted ? 'text-success' : expired ? 'text-danger' : 'text-fg-subtle'
                    )}
                  >
                    {accepted
                      ? `Aceptada el ${new Date(invite.acceptedAt!).toLocaleDateString('es-AR')}`
                      : expired
                        ? 'Vencida'
                        : `Vence el ${new Date(invite.expiresAt).toLocaleDateString('es-AR')}`}
                  </p>
                </div>

                <InviteActions invite={invite} url={url} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
