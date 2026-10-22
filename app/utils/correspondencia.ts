import type { Correspondencia } from '~/types/correspondencia'

export function correspondenciaTieneCite(c: Pick<Correspondencia, 'cite_origen'>): boolean {
  return Boolean(c.cite_origen?.trim())
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

/** Requiere correlativo, HR y documento generado en OnlyOffice antes de derivar. */
export function correspondenciaPuedeDerivar(
  c: Pick<Correspondencia, 'nro' | 'hr_id' | 'hoja_ruta' | 'url_documento' | 'contenido'>,
): boolean {
  return (
    !correspondenciaSinNumerar(c) &&
    correspondenciaTieneHojaRuta(c) &&
    correspondenciaTieneDocumentoOficial(c)
  )
}

export const MENSAJE_SIN_NUMERACION_HR =
  'Debe asignar numeración y Hoja de Ruta (CITE) antes de derivar esta correspondencia.'

/** Aviso al eliminar: el backend exige último correlativo de correspondencia y de HR. */
export const MENSAJE_ELIMINAR_CORRELATIVO =
  'Solo se puede eliminar si es el último número de correspondencia del proceso/área/gestión y, si tiene Hoja de Ruta, la HR es la última del área/año. No se permiten huecos en los correlativos.'

export const MENSAJE_SIN_DOCUMENTO_OFICIAL =
  'Debe generar el documento  antes de derivar esta correspondencia.'

/** Mensaje de validación al bloquear derivación (borrador / modal). */
export function mensajeNoDerivarCorrespondencia(
  c: Pick<Correspondencia, 'nro' | 'hr_id' | 'hoja_ruta' | 'url_documento' | 'contenido'>,
): string {
  if (correspondenciaSinNumerar(c) || !correspondenciaTieneHojaRuta(c)) {
    return MENSAJE_SIN_NUMERACION_HR
  }
  if (!correspondenciaTieneDocumentoOficial(c)) {
    return MENSAJE_SIN_DOCUMENTO_OFICIAL
  }
  return MENSAJE_SIN_NUMERACION_HR
}

type CorrespondenciaObservaciones = Pick<
  Correspondencia,
  'nro' | 'hr_id' | 'hoja_ruta' |'url_documento' | 'contenido' | 'proceso'
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

  const tienePlantilla = Boolean(c.proceso?.plantilla?.trim())
  if (!correspondenciaTieneDocumentoOficial(c)) {
    if (!tienePlantilla) {
      items.push('El proceso no tiene plantilla Word; no se puede generar el documento.')
    } else {
      items.push('Falta generar el documento.')
    }
  }

  return items
}

export function textoTooltipObservacionesCorrespondencia(observaciones: string[]): string {
  return observaciones.map((o) => `• ${o}`).join('\n')
}
