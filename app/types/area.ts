export interface AreaProcesoItem {
  proc_id: number;
  proceso: {
    id: number;
    nombre: string;
    codigo: string;
    tramite: boolean;
  };
}

export interface Area {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  id_anterior?: number | null;
  area_padre_id?: string | null;
  area_comunicacion_id?: string | null;
  areas_areas_area_padre_idToareas?: {
    id: string;
    nombre: string;
    codigo: string;
  } | null;
  areas_areas_area_comunicacion_idToareas?: {
    id: string;
    nombre: string;
    codigo: string;
  } | null;
  area_proceso?: AreaProcesoItem[];
  _count?: {
    cargos?: number;
    correspondencia?: number;
    derivaciones?: number;
    other_areas_areas_area_padre_idToareas?: number;
  };
}

export interface CreateAreaPayload {
  codigo: string;
  nombre: string;
  activo?: boolean;
  id_anterior?: number;
  area_padre_id?: string;
  area_comunicacion_id?: string;
  procesos_ids?: number[];
}

export interface UpdateAreaPayload extends Partial<CreateAreaPayload> {}

export interface FiltroArea {
  criterio?: string;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  area_padre_id?: string;
  pagina?: number;
  limite?: number;
}

export interface VistaArea {
  datos: Area[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export type RespuestaBusquedaArea = VistaArea;
