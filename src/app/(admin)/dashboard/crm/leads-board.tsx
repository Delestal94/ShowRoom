'use client'

import { useRouter } from 'next/navigation'
import { LeadsKanban } from '@/components/leads-kanban'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string | null
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
  createdAt: Date
  source: string
}

export function LeadsBoard({ leads }: { leads: Lead[] }) {
  const router = useRouter()

  const onStatusChange = async (leadId: string, status: string) => {
    try {
      const res = await fetch(`/api/dashboard/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return { error: body.error ?? 'No se pudo actualizar el estado del lead.' }
      }

      router.refresh()
      return {}
    } catch {
      return { error: 'No se pudo actualizar el estado del lead.' }
    }
  }

  return <LeadsKanban leads={leads} onStatusChange={onStatusChange} />
}
