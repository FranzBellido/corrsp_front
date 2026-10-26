export interface CodificadorDto {
  id: number | string;
  nombre: string;
  descripcion?: string | null;
  codigo?: string;
  requiere_cooperativa?: boolean;
  requiere_entidad?: boolean;
  requiere_pago?: boolean;
  requiere_corelativo?: boolean;
  requiere_destinatario?: boolean;
  referencia?: string | null;
  requiere_documento?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
