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

/** Requiere correlativo y HR asociada antes de derivar. */
export function correspondenciaPuedeDerivar(
  c: Pick<Correspondencia, 'nro' | 'hr_id' | 'hoja_ruta'>,
): boolean {
  return !correspondenciaSinNumerar(c) && correspondenciaTieneHojaRuta(c)
}

export const MENSAJE_SIN_NUMERACION_HR =
  'Debe asignar numeración y Hoja de Ruta (CITE) antes de derivar esta correspondencia.'
