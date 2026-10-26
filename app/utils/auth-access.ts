export const RUTA_ACCESO_DENEGADO = '/acceso-denegado'

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
