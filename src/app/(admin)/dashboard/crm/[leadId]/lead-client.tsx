'use client'

import { useRef, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { setLeadStatusAction, addNoteAction, type LeadState } from './actions'

const STATUSES = [
  { id: 'new', label: 'Nuevo' },
  { id: 'contacted', label: 'Contactado' },
  { id: 'qualified', label: 'Calificado' },
  { id: 'won', label: 'Ganado' },
  { id: 'lost', label: 'Perdido' },
] as const

export function LeadStatusPicker({ leadId, status }: { leadId: string; status: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const change = (next: string) => {
    if (next === status) return
    setError(null)
    startTransition(async () => {
      const result = await setLeadStatusAction(leadId, next)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div
        className={cn(
          'flex flex-wrap gap-1 rounded-full border border-border p-1',
          pending && 'opacity-60'
        )}
      >
        {STATUSES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => change(s.id)}
            disabled={pending}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              status === s.id
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:text-fg'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

function NoteSubmit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Guardando…' : 'Agregar nota'}
    </Button>
  )
}

export function AddNoteForm({ leadId }: { leadId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState<LeadState, FormData>(
    async (prev, formData) => {
      const result = await addNoteAction(leadId, prev, formData)
      // Only clear on success, so a failed save doesn't lose what was typed.
      if (!result.error) formRef.current?.reset()
      return result
    },
    {}
  )

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <textarea
        name="note"
        rows={3}
        placeholder="Lo llamé, quedó en pensarlo hasta el viernes…"
        className="w-full rounded-md border border-border bg-surface-2/60 p-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
      />
      <NoteSubmit />
    </form>
  )
}
