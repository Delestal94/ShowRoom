'use client'

import { useState } from 'react'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
  createdAt: Date
  source: string
}

interface LeadsKanbanProps {
  leads: Lead[]
  onStatusChange?: (leadId: string, status: string) => Promise<void>
}

const STATUSES = [
  { id: 'new', label: 'New', color: 'bg-gray-100' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100' },
  { id: 'qualified', label: 'Qualified', color: 'bg-yellow-100' },
  { id: 'won', label: 'Won', color: 'bg-green-100' },
  { id: 'lost', label: 'Lost', color: 'bg-red-100' },
]

function LeadCard({ lead, onStatusChange }: { lead: Lead; onStatusChange?: (status: string) => void }) {
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange) return
    setLoading(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition cursor-grab active:cursor-grabbing">
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 truncate">{lead.name}</h3>
        <p className="text-xs text-gray-600 truncate">{lead.email}</p>
        {lead.phone && (
          <p className="text-xs text-gray-500">{lead.phone}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs mb-3">
        <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
          {lead.source}
        </span>
        <span className="text-gray-400">
          {new Date(lead.createdAt).toLocaleDateString()}
        </span>
      </div>

      {onStatusChange && (
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((status) => (
            <button
              key={status.id}
              onClick={() => handleStatusChange(status.id)}
              disabled={loading}
              className={`text-xs px-2 py-1 rounded transition ${
                lead.status === status.id
                  ? `${status.color} font-semibold`
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              } disabled:opacity-50`}
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
    leads: leads.filter((l) => l.status === status.id as any),
  }))

  return (
    <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.id} className="min-w-sm flex-shrink-0">
          <div className="bg-gray-50 rounded-lg p-4 min-h-96">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900">{column.label}</h3>
              <span className="text-xs text-gray-600">
                {column.leads.length} lead{column.leads.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {column.leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusChange={
                    onStatusChange
                      ? (status) => onStatusChange(lead.id, status)
                      : undefined
                  }
                />
              ))}

              {column.leads.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  No leads
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
