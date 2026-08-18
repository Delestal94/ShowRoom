'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string | null
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
  createdAt: Date
  source: string
}

interface LeadsKanbanProps {
  leads: Lead[]
  onStatusChange?: (leadId: string, status: string) => Promise<void>
}

const STATUSES = [
  { id: 'new', label: 'Nuevo', dot: 'bg-fg-subtle' },
  { id: 'contacted', label: 'Contactado', dot: 'bg-primary' },
  { id: 'qualified', label: 'Calificado', dot: 'bg-accent' },
  { id: 'won', label: 'Ganado', dot: 'bg-success' },
  { id: 'lost', label: 'Perdido', dot: 'bg-danger' },
] as const

function LeadCard({
  lead,
  onStatusChange,
}: {
  lead: Lead
  onStatusChange?: (status: string) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange || newStatus === lead.status) return
    setLoading(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface p-4 transition-opacity',
        loading && 'opacity-50'
      )}
    >
      <Link
        href={`/dashboard/crm/${lead.id}`}
        className="truncate font-medium text-fg hover:text-primary hover:underline"
      >
        {lead.name}
      </Link>
      <p className="truncate text-xs text-fg-muted">{lead.email}</p>
      {lead.phone && <p className="text-xs text-fg-subtle">{lead.phone}</p>}

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="rounded-full bg-surface-2 px-2 py-1 text-fg-muted">{lead.source}</span>
        <span className="text-fg-subtle">{new Date(lead.createdAt).toLocaleDateString('es-AR')}</span>
      </div>

      {onStatusChange && (
        <div className="mt-3 flex flex-wrap gap-1">
          {STATUSES.map((status) => (
            <button
              key={status.id}
              type="button"
              onClick={() => handleStatusChange(status.id)}
              disabled={loading}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-wait',
                lead.status === status.id
                  ? 'bg-primary/15 text-primary'
                  : 'bg-surface-2 text-fg-subtle hover:bg-surface-2/70 hover:text-fg-muted'
              )}
            >
              {status.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LeadsKanban({ leads, onStatusChange }: LeadsKanbanProps) {
  const columns = STATUSES.map((status) => ({
    ...status,
    leads: leads.filter((l) => l.status === status.id),
  }))

  return (
    <div className="grid grid-flow-col auto-cols-[16rem] gap-4 overflow-x-auto pb-2">
      {columns.map((column) => (
        <div key={column.id} className="rounded-2xl border border-border bg-surface/30 p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', column.dot)} />
            <h3 className="font-medium text-fg">{column.label}</h3>
            <span className="ml-auto text-xs text-fg-subtle">{column.leads.length}</span>
          </div>

          <div className="space-y-2.5">
            {column.leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={
                  onStatusChange ? (status) => onStatusChange(lead.id, status) : undefined
                }
              />
            ))}

            {column.leads.length === 0 && (
              <div className="py-8 text-center text-sm text-fg-subtle">Sin leads</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
