export interface LeArancelTramite {
  id: number
  nombre: string
  costo_tramite: number
  tipo_cobro?: string | null
  activo: boolean
  variable: boolean
}

export interface LeDetalleProcesoItem {
  id_arancel: number
  n_hojas?: number | null
  corresp_id: string
  documento: string
  costo: number
  cantidad: number
  arancel?: LeArancelTramite | null
}

export interface LegalizacionDepositoResumen {
  id: string
  numero: string
  importe: number
  verificado: boolean
}

export interface LegalizacionResumen {
  corresp_id: string
  referencia: string
  requiere_legalizacion: boolean
  items: LeDetalleProcesoItem[]
  total_legalizacion: number
  total_depositos: number
  montos_coinciden: boolean
  depositos: LegalizacionDepositoResumen[]
}

export interface LegalizacionDetallePayload {
  id_arancel: number
  n_hojas?: number | null
  cantidad: number
  documento: string
}

export interface GuardarLegalizacionPayload {
  corresp_id: string
  derivacion_id: string
  cargo_id?: string
  items: LegalizacionDetallePayload[]
}
