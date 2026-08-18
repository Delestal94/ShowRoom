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
    const res = await fetch(`/api/dashboard/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) router.refresh()
  }

  return <LeadsKanban leads={leads} onStatusChange={onStatusChange} />
}
