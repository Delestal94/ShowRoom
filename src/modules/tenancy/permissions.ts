/**
 * Chequeos de rol reutilizables entre módulos. Hoy sólo cubre plano-3d
 * (RF-47): un broker puede vender la unidad, no rehacer su modelo 3D. Si
 * aparece otro módulo con la misma necesidad, generalizar desde acá en vez
 * de duplicar la lista de roles en cada route.
 */

export type MembershipRole = 'tenant_admin' | 'editor' | 'broker' | (string & {})

/** Content and inventory affect the public storefront. */
export function canManageContent(role: string): boolean {
  return role === 'tenant_admin' || role === 'editor'
}

/** tenant_admin y editor pueden trazar/editar planos; broker sólo puede verlos publicados. */
export const canEditFloorPlans = canManageContent

/** Brokers work leads, but may not alter the project's public content. */
export function canManageCrm(role: string): boolean {
  return role === 'tenant_admin' || role === 'editor' || role === 'broker'
}

/** Billing and organisation-wide settings have financial/security impact. */
export function canManageTenant(role: string): boolean {
  return role === 'tenant_admin'
}
