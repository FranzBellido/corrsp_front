export interface AreaProcesoItem {
  proc_id: number;
  proceso: {
    id: number;
    nombre: string;
    codigo: string;
  };
}

export interface AreaRoutingDestino {
  id: string;
  area_destino_id: string;
  area_destino: {
    id: string;
    codigo: string;
    nombre: string;
    activo?: boolean;
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
 
  area_proceso?: AreaProcesoItem[];
  routing_destinos?: AreaRoutingDestino[];
  _count?: {
    cargos?: number;
    correspondencia?: number;
    derivaciones?: number;
    other_areas_areas_area_padre_idToareas?: number;
    area_routing_rules_area_routing_rules_area_origen_idToareas?: number;
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
  /** Lista blanca: áreas con las que puede comunicarse el área origen. */
  areas_destino_ids?: string[];
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
