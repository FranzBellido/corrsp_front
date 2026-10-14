export interface CodificadorDto {
  id: number | string;
  nombre: string;
  descripcion?: string | null;
  codigo?: string;
  requiere_cooperativa?: boolean;
  requiere_entidad?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
