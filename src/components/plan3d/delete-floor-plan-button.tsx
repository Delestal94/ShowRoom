'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteFloorPlanButton({
  projectId,
  planId,
}: {
  projectId: string
  planId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('¿Borrar esta planta? Se pierde el trazado y el plano original subido.')) return

    setLoading(true)
    try {
      const res = await fetch(
        `/api/dashboard/projects/${projectId}/floor-plans/${planId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        router.refresh()
      } else {
        alert('No se pudo borrar la planta. Probá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="shrink-0 rounded-full p-1.5 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
      aria-label="Borrar planta"
      title="Borrar planta"
    >
      {loading ? (
        <span className="block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-danger" />
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M8.75 1A1.75 1.75 0 007 2.75V3H4.25a.75.75 0 000 1.5h.3l.664 9.29A2.75 2.75 0 007.957 16h4.086a2.75 2.75 0 002.743-2.21l.664-9.29h.3a.75.75 0 000-1.5H13v-.25A1.75 1.75 0 0011.25 1h-2.5zM11.5 3v-.25a.25.25 0 00-.25-.25h-2.5a.25.25 0 00-.25.25V3h3zM8.5 6.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5zm3.25-.75a.75.75 0 00-.75.75v5.5a.75.75 0 001.5 0v-5.5a.75.75 0 00-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
}
