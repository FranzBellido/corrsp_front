import { getApi } from '~/services/backend.service';
import type {
  Cargo,
  CreateCargoPayload,
  UpdateCargoPayload,
  FiltroCargo,
  RespuestaBusquedaCargo,
} from '~/types/cargo';

export const cargoService = {
  /**
   * Buscar cargos con filtros y paginación (vía POST 'buscar')
   */
  async buscar(filtro: FiltroCargo): Promise<RespuestaBusquedaCargo> {
    const api = getApi();
    return await api<RespuestaBusquedaCargo>('cargos/buscar', {
      method: 'POST',
      body: filtro,
    });
  },

  /**
   * Listar todos los cargos
   */
  async listar(): Promise<Cargo[]> {
    const api = getApi();
    return await api<Cargo[]>('cargos', {
      method: 'GET',
    });
  },

  /**
   * Obtener cargo por UUID
   */
  async obtenerPorId(id: string): Promise<Cargo> {
    const api = getApi();
    return await api<Cargo>(`cargos/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Crear un nuevo cargo
   */
  async crear(payload: CreateCargoPayload): Promise<Cargo> {
    const api = getApi();
    return await api<Cargo>('cargos', {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Actualizar cargo existente
   */
  async actualizar(id: string, payload: UpdateCargoPayload): Promise<Cargo> {
    const api = getApi();
    return await api<Cargo>(`cargos/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  /**
   * Eliminar un cargo por UUID
   */
  async eliminar(id: string): Promise<Cargo> {
    const api = getApi();
    return await api<Cargo>(`cargos/${id}`, {
      method: 'DELETE',
    });
  },
};
