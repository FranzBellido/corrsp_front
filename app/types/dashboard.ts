export interface DashboardBandejas {
  borrador: number
  ingreso: number
  salida: number
  con_copia: number
  compartidos: number
  archivo: number
}

export interface DashboardDerivaciones {
  total: number
  nuevas: number
}

export interface DashboardResumen {
  gestion: number
  area: { id: string; codigo: string; nombre: string } | null
  cargo: { id: string; nombre: string }
  bandejas: DashboardBandejas
  derivaciones: DashboardDerivaciones
  correspondencia_area: number
}
