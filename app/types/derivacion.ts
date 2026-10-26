import type { Correspondencia } from '~/types/correspondencia'
import type { EstadoDerivacion } from '~/types/estado'

export interface DerivacionCargo {
  id: string
  nombre: string
  usuarios?: {
    id: string
    nombre_completo: string
  } | null
}

export interface DestinatarioCopia {
  id: string
  cargo_id: string
  nombre?: string | null
  derivacion_id: string
  usuario_id: string
  leido?: boolean | null
  fecha_leido?: string | null
  cargos?: DerivacionCargo | null
}

export interface Derivacion {
  id: string
  documento_id: string
  cargo_origen_id: string
  cargo_destino_id: string
  instruccion: string
  fecha_envio?: string | null
  created_at?: string | null
  tipo_instruccion_id: number
  usuario_id: string
  leido?: boolean | null
  fecha_leido?: string | null
  nombre?: string | null
  estado_id?: number | null
  estado?: EstadoDerivacion | null
  fecha_plazo?: string | null
  correspondencia?: Correspondencia | null
  codificador?: {
    codificadorId: number
    nombre?: string | null
    descripcion?: string | null
  } | null
  destinatarios_copia?: DestinatarioCopia[]
  cargo_origen?: DerivacionCargo | null
  cargo_destino?: DerivacionCargo | null
}

export interface CreateDerivacionPayload {
  documento_id: string
  cargo_destino_id: string
  instruccion: string
  tipo_instruccion_id: number
  copias?: string[]
  /** Cargo desde el cual se deriva (bandeja / selector de cargo). */
  cargo_origen_id?: string
  /** Límite para derivar, responder o archivar (ISO o YYYY-MM-DD). */
  fecha_plazo?: string
}

export interface UpdateDerivacionPayload {
  cargo_destino_id?: string
  instruccion?: string
  tipo_instruccion_id?: number
  fecha_plazo?: string | null
  cargo_id?: string
}

export interface FiltroDerivacion {
  criterio?: string
  /** Nº HR o formato numero/anio (ej. 142 o 142/2025) */
  hoja_ruta?: string
  modo: 'salida' | 'ingreso' | 'con_copia'
  cargo_id?: string
  pagina?: number
  limite?: number
}

export interface RespuestaBusquedaDerivacion {
  items: Derivacion[] | DestinatarioCopiaConDerivacion[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
  cargo_activo_id?: string
}

export interface DestinatarioCopiaConDerivacion extends DestinatarioCopia {
  derivaciones?: Derivacion | null
}

export interface CorrespondenciaDetalle extends Correspondencia {
  fecha_plazo?: string | null
  cargo_origen?: { id: string; nombre: string } | null
  derivaciones?: Derivacion[]
  marcado_leido?: boolean
}
