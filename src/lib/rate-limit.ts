import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'

/**
 * Límite de uso por ventana deslizante, contado en la base.
 *
 * En serverless cada invocación puede ser una instancia nueva, así que un
 * contador en memoria no limita nada — de ahí que el estado viva en Postgres.
 * Es una consulta por request, que para endpoints públicos de escritura es un
 * costo razonable.
 */

/** Identifica al visitante. Vercel pone el IP real en x-forwarded-for. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const ip = forwarded.split(',')[0]?.trim() || 'unknown'

  // Se guarda el hash y no el IP: alcanza para contar y evita almacenar un
  // dato personal que no necesitamos.
  const hash = createHash('sha256').update(ip).digest('hex').slice(0, 32)
  return `${scope}:${hash}`
}

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    // Un solo statement atómico: incrementa dentro de la ventana o la
    // reinicia si venció. Dos requests simultáneos no pueden ambos leer un
    // contador viejo y pisarse.
    const result = (await publicDb.execute(sql`
      insert into rate_limits (key, window_start, count)
      values (${key}, now(), 1)
      on conflict (key) do update set
        count = case
          when rate_limits.window_start < now() - (${windowSeconds} || ' seconds')::interval
          then 1
          else rate_limits.count + 1
        end,
        window_start = case
          when rate_limits.window_start < now() - (${windowSeconds} || ' seconds')::interval
          then now()
          else rate_limits.window_start
        end
      returning count
    `)) as any

    const count = Number(result.rows?.[0]?.count ?? 0)
    return { allowed: count <= limit, count, limit }
  } catch (error) {
    // Si el limitador falla, no se bloquea el tráfico legítimo: un error de
    // infraestructura no debería impedir que alguien deje una consulta.
    console.error('Rate limit check failed:', error)
    return { allowed: true, count: 0, limit }
  }
}

export function tooManyRequests(message: string) {
  return Response.json({ error: message }, { status: 429, headers: { 'Retry-After': '60' } })
}
