import type { Metadata } from 'next'
import Link from 'next/link'
import { createProjectAction } from '../actions'
import { NewProjectForm } from './new-project-form'

export const metadata: Metadata = { title: 'Nuevo proyecto' }

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver a proyectos
      </Link>

      <div className="mt-6 rounded-2xl border border-border bg-surface/50 p-8">
        <h1 className="text-title font-semibold text-fg">Crear proyecto</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Después vas a poder sumar unidades y subir el tour 3D.
        </p>

        <NewProjectForm action={createProjectAction} />
      </div>
    </div>
  )
}
