export interface RespuestaApi<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

export interface RespuestaLista<T = any> {
  success: boolean;
  message: string;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
