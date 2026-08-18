/**
 * Constantes sin dependencias de base de datos.
 *
 * Viven aparte del servicio a propósito: los componentes cliente las
 * necesitan, y si las importaran desde invitation-service arrastrarían `pg`
 * al bundle del navegador (lo que rompe el build con "Can't resolve 'fs'").
 */

export const INVITE_ROLES = ['tenant_admin', 'editor', 'broker'] as const
export type InviteRole = (typeof INVITE_ROLES)[number]

export const ROLE_LABEL: Record<string, string> = {
  tenant_admin: 'Administrador',
  editor: 'Editor',
  broker: 'Broker',
}

export const ROLE_DESCRIPTION: Record<string, string> = {
  tenant_admin: 'Acceso total, incluido plan y facturación.',
  editor: 'Carga y edita proyectos, unidades y leads.',
  broker: 'Ve los leads que le corresponden.',
}
