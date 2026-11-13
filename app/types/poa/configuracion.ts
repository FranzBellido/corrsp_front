export interface PoaConfiguracionVersionRef {
  gestion: number
  nombre: string
}

export interface PoaConfiguracion {
  id: number
  formulacio_version_id: number
  seguimiento_version_id: number
  certificacion_version_id: number
  acp_version_id: number
  nombre_formulacion: string
  nombre_seguimiento: string
  formulacion_version?: PoaConfiguracionVersionRef | null
  seguimiento_version?: PoaConfiguracionVersionRef | null
  certificacion_version?: PoaConfiguracionVersionRef | null
  acp_version?: PoaConfiguracionVersionRef | null
}

export interface UpdatePoaConfiguracionPayload {
  formulacio_version_id?: number
  seguimiento_version_id?: number
  certificacion_version_id?: number
  acp_version_id?: number
  nombre_formulacion?: string
  nombre_seguimiento?: string
}

export interface PoaConfiguracionFormState {
  formulacio_version_id: number
  seguimiento_version_id: number
  certificacion_version_id: number
  acp_version_id: number
  nombre_formulacion: string
  nombre_seguimiento: string
}
