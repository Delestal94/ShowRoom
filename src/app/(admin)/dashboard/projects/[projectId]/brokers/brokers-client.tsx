'use client'

import { useRef, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { createBrokerLinkAction, deleteBrokerLinkAction, type BrokerState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creando…' : 'Crear link'}
    </Button>
  )
}

export function NewBrokerLinkForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState<BrokerState, FormData>(
    async (prev, formData) => {
      const result = await createBrokerLinkAction(projectId, prev, formData)
      if (!result.error) formRef.current?.reset()
      return result
    },
    {}
  )

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.notice && <p className="text-sm text-success">{state.notice}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="brokerName"
          required
          placeholder="Inmobiliaria Pérez"
          className="h-11 flex-1 rounded-md border border-border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <SubmitButton />
      </div>
    </form>
  )
}

export function BrokerLinkRow({
  projectId,
  linkId,
  url,
}: {
  projectId: string
  linkId: string
  url: string
}) {
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Portapapeles bloqueado; la URL sigue visible.
    }
  }

  const remove = () => {
    startTransition(async () => {
      await deleteBrokerLinkAction(projectId, linkId)
      setConfirming(false)
    })
  }

  return (
    <div className="flex shrink-0 gap-1">
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? 'Copiado ✓' : 'Copiar link'}
      </Button>
      {confirming ? (
        <>
          <Button size="sm" variant="danger" onClick={remove} disabled={pending}>
            {pending ? '…' : 'Confirmar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            No
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          Borrar
        </Button>
      )}
    </div>
  )
}
