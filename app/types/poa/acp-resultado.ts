import type { PoaEstadoPermisos, PoaOperacion } from './poa-operacion'
import type { PoaActividad } from './poa-actividad'

export interface AcpResultado {
  id: string
  acp_id: string
  indicador?: string | null
  nombre: string
  estado_id: number
  poa_formulacion_id?: string | null
  numero: number
  ponderacion: number
  acp?: {
    id: string
    numero: number
    descripcion: string
    version_id: number
  }
  poa_estado?: PoaEstadoPermisos | null
  poa_operacion?: PoaOperacion[]
  _count?: {
    poa_operacion?: number
  }
}

export interface CreateAcpResultadoPayload {
  acp_id: string
  poa_formulacion_id: string
  nombre: string
  indicador?: string | null
  ponderacion: number
  estado_id?: number
}

export interface UpdateAcpResultadoPayload
  extends Partial<Omit<CreateAcpResultadoPayload, 'poa_formulacion_id'>> {}

export interface FiltroAcpResultado {
  poa_formulacion_id: string
  acp_id?: string
  pagina?: number
  limite?: number
}

export interface VistaAcpResultado {
  datos: AcpResultado[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export type RespuestaBusquedaAcpResultado = VistaAcpResultado

/** Fila aplanada para tabla árbol (resultado → operación → actividad). */
export type FormRowTipo = 'resultado' | 'operacion' | 'actividad'

export interface FormTreeRow {
  rowKey: string
  tipo: FormRowTipo
  id: string
  numero: number
  titulo: string
  ponderacion: number
  estadoNombre: string
  permite_editar: boolean
  permite_eliminar: boolean
  resultado?: AcpResultado
  operacion?: PoaOperacion
  actividad?: PoaActividad
  parentResultado?: AcpResultado
  parentOperacion?: PoaOperacion
}
