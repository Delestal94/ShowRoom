'use client'

import { useRouter } from 'next/navigation'

export function ProjectSelect({
  projects,
  selectedId,
}: {
  projects: { id: string; name: string }[]
  selectedId?: string
}) {
  const router = useRouter()

  return (
    <select
      defaultValue={selectedId ?? ''}
      onChange={(e) => {
        if (e.target.value) router.push(`/dashboard/analytics?projectId=${e.target.value}`)
      }}
      className="h-11 rounded-md border border-border bg-surface-2/60 px-4 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
    >
      <option value="" disabled>
        Elegí un proyecto
      </option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
