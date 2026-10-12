export interface CodificadorDto {
  id: number | string;
  nombre: string;
  descripcion?: string | null;
  codigo?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
