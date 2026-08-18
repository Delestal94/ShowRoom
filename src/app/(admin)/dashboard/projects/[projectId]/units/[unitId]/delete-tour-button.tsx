'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteTourAction } from './actions'

export function DeleteTourButton({
  projectId,
  unitId,
  tourId,
}: {
  projectId: string
  unitId: string
  tourId: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const remove = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteTourAction(projectId, unitId, tourId)
      if (result.error) setError(result.error)
      setConfirming(false)
    })
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="shrink-0">
        Borrar
      </Button>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
        {pending ? '…' : 'Confirmar'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        No
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
