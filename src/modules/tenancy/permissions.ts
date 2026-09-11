/**
 * Chequeos de rol reutilizables entre módulos. Hoy sólo cubre plano-3d
 * (RF-47): un broker puede vender la unidad, no rehacer su modelo 3D. Si
 * aparece otro módulo con la misma necesidad, generalizar desde acá en vez
 * de duplicar la lista de roles en cada route.
 */

export type MembershipRole = 'tenant_admin' | 'editor' | 'broker' | (string & {})

/** tenant_admin y editor pueden trazar/editar planos; broker sólo puede verlos publicados. */
export function canEditFloorPlans(role: string): boolean {
  return role === 'tenant_admin' || role === 'editor'
}
