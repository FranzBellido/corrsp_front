import type { Correspondencia } from '~/types/correspondencia'

/** CITE almacenado en corresp_entidad o corresp_cooperativa (compat. con cite_origen mapeado en API). */
export function citeOrigenCorrespondencia(
  c: Pick<Correspondencia, 'cite_origen' | 'corresp_entidad' | 'corresp_cooperativa'>,
): string {
  const directo = c.cite_origen?.trim()
  if (directo) return directo
  const citeEntidad = c.corresp_entidad?.[0]?.cite_origen?.trim()
  if (citeEntidad) return citeEntidad
  const citeCoop = c.corresp_cooperativa?.[0]?.cite_origen?.trim()
  if (citeCoop) return citeCoop
  return ''
}

export function correspondenciaTieneCite(
  c: Pick<Correspondencia, 'cite_origen' | 'corresp_entidad' | 'corresp_cooperativa'>,
): boolean {
  return Boolean(citeOrigenCorrespondencia(c))
}

export function correspondenciaSinNumerar(c: Pick<Correspondencia, 'nro'>): boolean {
  return !c.nro || c.nro <= 0
}

export function etiquetaNumeroCorrespondencia(c: Pick<Correspondencia, 'nro' | 'gestion'>): string {
  if (correspondenciaSinNumerar(c)) {
    return 'Sin numerar'
  }
  return `Nº ${c.nro}/${c.gestion}`
}

export function correspondenciaTieneHojaRuta(
  c: Pick<Correspondencia, 'hr_id' | 'hoja_ruta'>,
): boolean {
  return Boolean(c.hr_id?.trim() || c.hoja_ruta?.id)
}

export function correspondenciaTieneDocumentoOficial(
  c: Pick<Correspondencia, 'url_documento' | 'contenido'>,
): boolean {
  return Boolean((c.url_documento || c.contenido)?.trim())
}

/** Correspondencia de proceso externo (entrante/saliente). */
export function correspondenciaEsProcesoExterno(
  c: Pick<Correspondencia, 'proceso'>,
): boolean {
  return c.proceso?.interna === false
}

/** Exige documento OnlyOffice antes de derivar (flag del proceso o compat. procesos internos). */
export function correspondenciaRequiereDocumentoParaDerivar(
  c: Pick<Correspondencia, 'proceso'>,
): boolean {
  if (c.proceso?.requiere_documento === true) {
    return true
  }
  if (c.proceso?.requiere_documento === false) {
    return false
  }
  return !correspondenciaEsProcesoExterno(c)
}

/** Requiere correlativo y HR; documento OnlyOffice solo en procesos internos. */
export function correspondenciaPuedeDerivar(
  c: Pick<
    Correspondencia,
    'nro' | 'hr_id' | 'hoja_ruta' | 'url_documento' | 'contenido' | 'proceso'
  >,
): boolean {
  if (correspondenciaSinNumerar(c) || !correspondenciaTieneHojaRuta(c)) {
    return false
  }
  if (!correspondenciaRequiereDocumentoParaDerivar(c)) {
    return true
  }
  return correspondenciaTieneDocumentoOficial(c)
}

export const MENSAJE_SIN_NUMERACION_HR =
  'Debe asignar numeración y Hoja de Ruta (CITE) antes de derivar esta correspondencia.'

/** Aviso al eliminar: el backend exige último correlativo de correspondencia y de HR. */
export const MENSAJE_ELIMINAR_CORRELATIVO =
  'Solo se puede eliminar si es el último número de correspondencia del proceso/área/gestión y, si tiene Hoja de Ruta, la HR es la última del área/año. No se permiten huecos en los correlativos.'

export const MENSAJE_SIN_DOCUMENTO_OFICIAL =
  'Debe registrar el documento en OnlyOffice antes de derivar esta correspondencia.'

/** Mensaje de validación al bloquear derivación (borrador / modal). */
export function mensajeNoDerivarCorrespondencia(
  c: Pick<
    Correspondencia,
    'nro' | 'hr_id' | 'hoja_ruta' | 'url_documento' | 'contenido' | 'proceso'
  >,
): string {
  if (correspondenciaSinNumerar(c) || !correspondenciaTieneHojaRuta(c)) {
    return MENSAJE_SIN_NUMERACION_HR
  }
  if (
    correspondenciaRequiereDocumentoParaDerivar(c) &&
    !correspondenciaTieneDocumentoOficial(c)
  ) {
    return MENSAJE_SIN_DOCUMENTO_OFICIAL
  }
  return MENSAJE_SIN_NUMERACION_HR
}

type CorrespondenciaObservaciones = Pick<
  Correspondencia,
  'nro' | 'hr_id' | 'hoja_ruta' | 'url_documento' | 'contenido' | 'proceso' | 'cite_origen' | 'corresp_entidad' | 'corresp_cooperativa'
>

/** Avisos visibles en bandeja (tooltip junto al detalle). */
export function observacionesPendientesCorrespondencia(c: CorrespondenciaObservaciones): string[] {
  const items: string[] = []

  if (correspondenciaSinNumerar(c)) {
    items.push('Falta asignar numeración correlativa.')
  }
  if (!correspondenciaTieneHojaRuta(c)) {
    items.push('Falta asociar Hoja de Ruta (CITE).')
  }
  if (!correspondenciaTieneCite(c)) {
    items.push('Falta asignar CITE de origen.')
  }

  if (correspondenciaRequiereDocumentoParaDerivar(c)) {
    const tienePlantilla = Boolean(c.proceso?.plantilla?.trim())
    if (!correspondenciaTieneDocumentoOficial(c)) {
      if (!tienePlantilla) {
        items.push('El proceso no tiene plantilla Word; no se puede generar el documento.')
      } else {
        items.push('Falta generar el documento.')
      }
    }
  }

  return items
}

export function textoTooltipObservacionesCorrespondencia(observaciones: string[]): string {
  return observaciones.map((o) => `• ${o}`).join('\n')
}

export const MENSAJE_ALERTA_DEPOSITO_PENDIENTE =
  'El proceso requiere pago y hay boleta(s) de depósito pendiente(s) de verificación en recaudaciones.'

export function correspondenciaTieneAlertaDepositoPendiente(
  c: Pick<Correspondencia, 'alerta_deposito_pendiente' | 'proceso' | 'depositos'>,
): boolean {
  if (c.alerta_deposito_pendiente === true) return true
  if (!c.proceso?.requiere_pago) return false
  const depositos = c.depositos ?? []
  if (!depositos.length) return false
  return depositos.some((d) => d.verificado !== true)
}
