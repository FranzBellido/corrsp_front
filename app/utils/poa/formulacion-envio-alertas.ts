import type { FormTreeRow } from '~/types/poa/acp-resultado'
import { metaProgramadaDeActividad } from '~/types/poa/poa-actividad'

/** Debe coincidir con el backend (`PONDERACION_OBJETIVO_ENVIO`). */
export const PONDERACION_OBJETIVO_ENVIO = 100

function etiquetaResultado(numero: number, nombre: string) {
  return `Resultado ${numero} (${nombre.trim() || 'sin nombre'})`
}

function etiquetaOperacion(opNumero: number, resNumero: number, resNombre: string) {
  return `Operación ${opNumero} de ${etiquetaResultado(resNumero, resNombre)}`
}

/** Observaciones de envío que aplican a una fila del árbol (misma regla que el backend). */
export function observacionesParaFilaTree(
  item: FormTreeRow,
  alertasGlobales: string[],
): string[] {
  const out: string[] = []

  if (item.tipo === 'resultado' && item.resultado) {
    const r = item.resultado
    const acpNum = r.acp?.numero
    if (acpNum != null) {
      out.push(...alertasGlobales.filter((o) => o.startsWith(`ACP ${acpNum}:`)))
    }
    const pref = `Resultado ${r.numero}`
    out.push(
      ...alertasGlobales.filter((o) => o.startsWith(`${pref} (`) && o.includes('operaciones suman')),
    )

    const sumaOps = (r.poa_operacion ?? []).reduce(
      (acc, o) => acc + (o.ponderacion ?? 0),
      0,
    )
    if (sumaOps !== PONDERACION_OBJETIVO_ENVIO) {
      out.push(
        `${pref} (${r.nombre.trim() || 'sin nombre'}): las operaciones suman ${sumaOps}% (debe ser ${PONDERACION_OBJETIVO_ENVIO}%).`,
      )
    }
  }

  if (item.tipo === 'operacion' && item.operacion && item.parentResultado) {
    const r = item.parentResultado
    const o = item.operacion
    const opEtiqueta = etiquetaOperacion(o.numero, r.numero, r.nombre)
    out.push(...alertasGlobales.filter((o) => o.startsWith(opEtiqueta)))

    const sumaActs = (o.poa_actividades ?? []).reduce(
      (acc, a) => acc + (a.ponderacion ?? 0),
      0,
    )
    if (sumaActs !== PONDERACION_OBJETIVO_ENVIO) {
      out.push(
        `${opEtiqueta}: las actividades suman ${sumaActs}% (debe ser ${PONDERACION_OBJETIVO_ENVIO}%).`,
      )
    }
  }

  if (
    item.tipo === 'actividad' &&
    item.actividad &&
    item.parentOperacion &&
    item.parentResultado
  ) {
    const r = item.parentResultado
    const op = item.parentOperacion
    const a = item.actividad
    const opEtiqueta = etiquetaOperacion(op.numero, r.numero, r.nombre)
    const actLbl = a.descripcion?.trim() || `actividad ${a.numero}`
    const prefijo = `${opEtiqueta}, ${actLbl}`
    out.push(...alertasGlobales.filter((o) => o.startsWith(prefijo)))

    if (a.porcentual) {
      const sumaProg = metaProgramadaDeActividad(a)
      if (sumaProg !== PONDERACION_OBJETIVO_ENVIO) {
        out.push(
          `${prefijo}: programación porcentual ${sumaProg}% (debe sumar ${PONDERACION_OBJETIVO_ENVIO}%).`,
        )
      }
    }
  }

  return [...new Set(out)]
}