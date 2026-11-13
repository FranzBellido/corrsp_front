export interface FlujoAccionEstado {
  id: number
  nombre: string
  descripcion?: string | null
}

export interface FlujoAccionCargoRef {
  id: string
  nombre: string
}

export interface FlujoAccion {
  id: number
  proc_id: number
  id_estado?: number | null
  desc_operacion?: string | null
  activo: boolean
  cargo_origen_id: string
  cargo_destino_id: string
  instruccion_id?: number | null
  instruccion: string
  estado?: FlujoAccionEstado | null
  cargo_origen?: FlujoAccionCargoRef | null
  cargo_destino?: FlujoAccionCargoRef | null
}

export interface CreateFlujoAccionPayload {
  id_estado?: number
  desc_operacion?: string
  activo: boolean
  cargo_origen_id: string
  cargo_destino_id: string
  instruccion_id?: number
  instruccion: string
}

export interface UpdateFlujoAccionPayload extends Partial<CreateFlujoAccionPayload> {}
