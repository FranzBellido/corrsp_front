import type { Derivacion } from '~/types/correspo/derivacion'
import {
  etiquetaCorrelativoBandeja,
  etiquetaHojaRuta,
} from '~/utils/correspo/correspondencia'

export const SALIDA_REPORTE_FILAS_POR_PAGINA = 8

export interface FilaReporteSalida {
  id: string
  hojaRuta: string
  correlativo: string
  proceso: string
  cargoOrigen: string
  cargoDestino: string
  referencia: string
  fechaDerivacion: string
}

function formatFechaDerivacion(valor?: string | null): string {
  if (!valor?.trim()) return '—'
  try {
    return new Date(valor).toLocaleString('es-BO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return valor
  }
}

export function filaReporteDesdeDerivacion(d: Derivacion): FilaReporteSalida {
  const c = d.correspondencia
  return {
    id: d.id,
    hojaRuta: etiquetaHojaRuta(c?.hoja_ruta),
    correlativo: etiquetaCorrelativoBandeja(c ?? { nro: 0, gestion: 0 }),
    proceso: c?.proceso?.nombre?.trim() || '—',
    cargoOrigen: d.cargo_origen?.nombre?.trim() || '—',
    cargoDestino: d.cargo_destino?.nombre?.trim() || '—',
    referencia: c?.referencia?.trim() || '—',
    fechaDerivacion: formatFechaDerivacion(d.fecha_envio),
  }
}

export type PaginaReporteSalida = Array<FilaReporteSalida | null>

/** Divide filas en páginas de 8; la primera respeta la posición inicial (1–8). */
export function paginasReporteSalida(
  filas: FilaReporteSalida[],
  posicionInicial: number,
): PaginaReporteSalida[] {
  const paginas: PaginaReporteSalida[] = []
  let i = 0
  const inicio = Math.min(Math.max(posicionInicial, 1), SALIDA_REPORTE_FILAS_POR_PAGINA) - 1

  const primera: PaginaReporteSalida = Array.from(
    { length: SALIDA_REPORTE_FILAS_POR_PAGINA },
    () => null,
  )
  for (let slot = inicio; slot < SALIDA_REPORTE_FILAS_POR_PAGINA && i < filas.length; slot++, i++) {
    primera[slot] = filas[i]!
  }
  paginas.push(primera)

  while (i < filas.length) {
    const hoja: PaginaReporteSalida = Array.from(
      { length: SALIDA_REPORTE_FILAS_POR_PAGINA },
      () => null,
    )
    for (let slot = 0; slot < SALIDA_REPORTE_FILAS_POR_PAGINA && i < filas.length; slot++, i++) {
      hoja[slot] = filas[i]!
    }
    paginas.push(hoja)
  }

  return paginas
}

function celdaTexto(valor: string): string {
  return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function htmlImpresionReporteSalida(
  paginas: PaginaReporteSalida[],
  opts: { titulo?: string; posicionInicial: number },
): string {
  const titulo = opts.titulo || 'Reporte de salida — Correspondencia AFCOOP'
  const cuerpo = paginas
    .map((pagina, idx) => {
      const filas = pagina
        .map((fila) => {
          if (!fila) {
            return '<tr class="fila-vacia"><td colspan="7">&nbsp;</td></tr>'
          }
          return `<tr>
  <td>${celdaTexto(fila.hojaRuta)}</td>
  <td>${celdaTexto(fila.correlativo)}</td>
  <td>${celdaTexto(fila.proceso)}</td>
  <td>${celdaTexto(fila.cargoOrigen)}</td>
  <td>${celdaTexto(fila.cargoDestino)}</td>
  <td>${celdaTexto(fila.referencia)}</td>
  <td>${celdaTexto(fila.fechaDerivacion)}</td>
</tr>`
        })
        .join('')
      return `<section class="pagina-reporte${idx < paginas.length - 1 ? ' salto' : ''}">
  <header class="encabezado-pagina">
    <h1>${celdaTexto(titulo)}</h1>
    <p>Página ${idx + 1} de ${paginas.length} · Posición inicial: ${opts.posicionInicial}</p>
  </header>
  <table>
    <thead>
      <tr>
        <th>Hoja de ruta</th>
        <th>Correlativo</th>
        <th>Proceso</th>
        <th>Cargo origen</th>
        <th>Cargo destino</th>
        <th>Referencia</th>
        <th>Fecha derivación</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
</section>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${celdaTexto(titulo)}</title>
  <style>
    @page { size: letter landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111; margin: 0; }
    .encabezado-pagina { margin-bottom: 6px; }
    .encabezado-pagina h1 { font-size: 11pt; margin: 0 0 2px; }
    .encabezado-pagina p { margin: 0; font-size: 8pt; color: #444; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #333; padding: 4px 5px; vertical-align: top; word-wrap: break-word; }
    th { background: #e8e8e8; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.02em; }
    td { font-size: 8.5pt; line-height: 1.25; }
    .fila-vacia td { height: 22px; border-color: #bbb; }
    .pagina-reporte { min-height: calc(100vh - 2mm); }
    .pagina-reporte.salto { page-break-after: always; }
    @media print {
      .pagina-reporte { min-height: auto; }
    }
  </style>
</head>
<body>${cuerpo}</body>
</html>`
}

export function imprimirReporteSalidaEnNavegador(
  filas: FilaReporteSalida[],
  posicionInicial: number,
): void {
  if (!filas.length) return
  const paginas = paginasReporteSalida(filas, posicionInicial)
  const html = htmlImpresionReporteSalida(paginas, { posicionInicial })
  const ventana = window.open('', '_blank', 'noopener,noreferrer')
  if (!ventana) {
    throw new Error('El navegador bloqueó la ventana de impresión')
  }
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => {
    ventana.print()
  }, 300)
}
