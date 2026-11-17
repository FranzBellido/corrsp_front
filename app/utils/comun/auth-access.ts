export const RUTA_ACCESO_DENEGADO = '/acceso-denegado'

/** Rol Keycloak (`realm_access.roles`) para el menú y APIs de administración. */
export const ROLE_PROC_ADMIN = 'proc_admin'

/** Rol Keycloak para el menú y gestión de recaudaciones. */
export const ROLE_PROC_RECAUDACION = 'proc_recaudacion'

/** Administración POA (configuración, ACP, versiones, validación). */
export const ROLE_POA_ADMIN = 'poa_admin'

/** Formulación POA del área (resultados, operaciones, actividades). */
export const ROLE_POA_USER = 'poa_user'

/** Prefijos de rutas del menú Administración. */
export const RUTAS_ADMINISTRACION = [
  '/areas',
  '/usuarios',
  '/cargos',
  '/procesos',
  '/codificadores',
  '/entidades',
] as const

export function esRutaAdministracion(path: string): boolean {
  return RUTAS_ADMINISTRACION.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  )
}

/** Prefijos de rutas del menú Recaudaciones. */
export const RUTAS_RECAUDACION = ['/recaudaciones', '/rec_dashboard'] as const

export function esRutaRecaudacion(path: string): boolean {
  return RUTAS_RECAUDACION.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  )
}

/** Catálogo y validación POA (menú Administrador POA). */
export const RUTAS_POA_ADMIN = [
  '/configuracion',
  '/formulaciones-admin',
  '/seguimientos-admin',
  '/versiones',
  '/acp',
] as const

export function esRutaPoaAdmin(path: string): boolean {
  return RUTAS_POA_ADMIN.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  )
}

/** Formulación / seguimiento POA por área. */
export const RUTAS_POA_USER = ['/formulacion', '/seguimiento'] as const

export function esRutaPoaUser(path: string): boolean {
  return RUTAS_POA_USER.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  )
}

export function tieneRolPoaFormulacion(roles: string[]): boolean {
  return roles.includes(ROLE_POA_USER) || roles.includes(ROLE_POA_ADMIN)
}

export function extractHttpStatus(error: unknown): number | undefined {
  const err = error as {
    statusCode?: number
    status?: number
    response?: { status?: number; _data?: { statusCode?: number } }
    data?: { statusCode?: number }
  }
  const status =
    err?.statusCode
    ?? err?.status
    ?? err?.response?.status
    ?? err?.response?._data?.statusCode
    ?? err?.data?.statusCode
  return typeof status === 'number' ? status : undefined
}

function mensajeDeError(error: unknown): string {
  const err = error as {
    data?: { message?: string | string[] }
    message?: string
  }
  const nested = err?.data?.message
  if (Array.isArray(nested)) return nested.join(' ')
  if (typeof nested === 'string') return nested
  return typeof err?.message === 'string' ? err.message : ''
}

/** Usuario autenticado en Keycloak pero sin fila en correspo.usuarios (perfil 404). */
export function isUsuarioNoRegistradoEnSistema(error: unknown): boolean {
  if (extractHttpStatus(error) === 404) return true

  const msg = mensajeDeError(error).toLowerCase()
  if (!msg) return false

  return (
    msg.includes('no encontrado')
    || msg.includes('not found')
    || (msg.includes('usuario') && msg.includes('nombre_usuario'))
  )
}