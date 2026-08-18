'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toggleProjectStatusAction, deleteProjectAction } from '../actions'

export function PublishToggle({
  projectId,
  status,
}: {
  projectId: string
  status: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const isPublished = status === 'published'

  const toggle = () => {
    setError(null)
    startTransition(async () => {
      const result = await toggleProjectStatusAction(projectId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={toggle}
        disabled={pending}
        size="sm"
        variant={isPublished ? 'outline' : 'primary'}
      >
        {pending ? '…' : isPublished ? 'Despublicar' : 'Publicar'}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-danger">{error}</p>}
    </div>
  )
}

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const remove = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteProjectAction(projectId)
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
      }
    })
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Borrar proyecto
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-fg-muted">
        Se borran también sus unidades y tours. No se puede deshacer.
      </p>
      <div className="flex gap-2">
        <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
          {pending ? 'Borrando…' : 'Sí, borrar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
