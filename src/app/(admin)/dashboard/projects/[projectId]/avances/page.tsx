import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { listUpdates } from '@/modules/construction/construction-service'
import { isEmailConfigured } from '@/modules/notifications/email'
import { NewUpdateForm, UpdateActions } from './avances-client'

export const metadata: Metadata = { title: 'Avances de obra' }

export default async function AvancesPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const updates = await listUpdates(tenant.tenantId, params.projectId)

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-4">
        <h1 className="text-title font-semibold text-fg">Avances de obra</h1>
        <p className="mt-1 text-fg-muted">
          Contale a quienes consultaron cómo viene {project.name}. Es lo que los hace volver
          durante los años de obra.
        </p>
      </div>

      {!isEmailConfigured() && (
        <p className="mt-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          El aviso por mail no está configurado (faltan <code>RESEND_API_KEY</code> y{' '}
          <code>RESEND_FROM</code>). Podés publicar avances igual; sólo no se envían.
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-surface/50 p-6">
        <h2 className="font-semibold text-fg">Nuevo avance</h2>
        <div className="mt-5">
          <NewUpdateForm projectId={params.projectId} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-title font-semibold text-fg">Publicados</h2>

        {updates.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-muted">
            Todavía no cargaste ningún avance.
          </p>
        ) : (
          <ol className="mt-5 space-y-4">
            {updates.map((update) => {
              const images = (update.imagesJson ?? []) as { cdnUrl: string }[]

              return (
                <li
                  key={update.id}
                  className="rounded-2xl border border-border bg-surface/50 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-fg">{update.title}</h3>
                        <span
                          className={
                            update.publishedAt
                              ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success'
                              : 'rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning'
                          }
                        >
                          {update.publishedAt ? 'Publicado' : 'Borrador'}
                        </span>
                        {update.notifiedAt && (
                          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-subtle">
                            Avisado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {new Date(update.createdAt).toLocaleDateString('es-AR')}
                        {typeof update.progressPercent === 'number' &&
                          ` · ${update.progressPercent}% de avance`}
                      </p>
                    </div>

                    <UpdateActions
                      projectId={params.projectId}
                      updateId={update.id}
                      published={Boolean(update.publishedAt)}
                      notified={Boolean(update.notifiedAt)}
                    />
                  </div>

                  {update.body && (
                    <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                      {update.body}
                    </p>
                  )}

                  {images.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {images.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img.cdnUrl}
                          alt=""
                          className="h-20 w-28 rounded-md border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
