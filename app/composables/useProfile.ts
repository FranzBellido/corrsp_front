import type { ProfileDto } from '~/types/profile'
import type { RespuestaApi } from '~/types/respuestas'
import { backendService } from '~/services/backend.service'

const PROFILE_STORAGE_KEY = 'user_profile_data'
export const CARGO_ORIGEN_STORAGE_KEY = 'cargo_origen_id'

export const useProfile = () => {
  const profile = useState<ProfileDto | null>('profile', () => null)
  const loading = useState<boolean>('profile-loading', () => false)
  const needsCargoSelection = useState<boolean>('needs-cargo-selection', () => false)

  const syncSessionArea = (areaId: string | null | undefined, areaNombre: string | null | undefined) => {
    if (!import.meta.client) return
    if (areaId) {
      sessionStorage.setItem('area_activa_id', areaId)
    } else {
      sessionStorage.removeItem('area_activa_id')
    }

    if (areaNombre) {
      sessionStorage.setItem('area_activa_nombre', areaNombre)
    } else {
      sessionStorage.removeItem('area_activa_nombre')
    }
  }

  const resolveAreaFromCargo = (p: ProfileDto, cargoId: string | null | undefined) => {
    let areaId: string | null = null
    let areaNombre: string | null = null
    if (cargoId && p.cargos?.length) {
      const cargoMatch = p.cargos.find((c) => c.id === cargoId)
      if (cargoMatch?.area) {
        areaId = cargoMatch.area.id
        areaNombre = cargoMatch.area.nombre
      } else if (cargoMatch?.area_id) {
        areaId = cargoMatch.area_id
      }
    }
    return { areaId, areaNombre }
  }

  const buildLocalProfile = (apiData: ProfileDto, cargoId: string | null): ProfileDto => {
    const { areaId, areaNombre } = resolveAreaFromCargo(apiData, cargoId)
    return {
      ...apiData,
      cargo_id: cargoId,
      cargo_activo_id: cargoId,
      area_activa_id: areaId,
      area_activa_nombre: areaNombre,
    }
  }

  const saveProfileToStorage = (updatedProfile: ProfileDto) => {
    const cargoId = updatedProfile.cargo_activo_id || updatedProfile.cargo_id || null
    const { areaId, areaNombre } = resolveAreaFromCargo(updatedProfile, cargoId)

    const normalized: ProfileDto = {
      ...updatedProfile,
      cargo_id: cargoId,
      cargo_activo_id: cargoId,
      area_activa_id: areaId ?? updatedProfile.area_activa_id ?? null,
      area_activa_nombre: areaNombre ?? updatedProfile.area_activa_nombre ?? null,
    }

    profile.value = normalized

    if (import.meta.client) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized))
      if (cargoId) {
        localStorage.setItem('cargo_activo_id', cargoId)
        localStorage.setItem(CARGO_ORIGEN_STORAGE_KEY, cargoId)
      } else {
        localStorage.removeItem('cargo_activo_id')
        localStorage.removeItem(CARGO_ORIGEN_STORAGE_KEY)
      }
      if (normalized.area_activa_id) {
        localStorage.setItem('area_activa_id', normalized.area_activa_id)
      } else {
        localStorage.removeItem('area_activa_id')
      }
      syncSessionArea(normalized.area_activa_id, normalized.area_activa_nombre)
    }
  }

  const loadProfileFromStorage = (): ProfileDto | null => {
    if (!import.meta.client) return null
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ProfileDto
        profile.value = parsed
        syncSessionArea(parsed.area_activa_id, parsed.area_activa_nombre)
        return parsed
      } catch (e) {
        console.error('Error parsing stored profile:', e)
      }
    }
    return null
  }

  const clearProfile = () => {
    profile.value = null
    needsCargoSelection.value = false
    if (import.meta.client) {
      localStorage.removeItem(PROFILE_STORAGE_KEY)
      localStorage.removeItem('cargo_activo_id')
      localStorage.removeItem(CARGO_ORIGEN_STORAGE_KEY)
      localStorage.removeItem('area_activa_id')
      sessionStorage.removeItem('area_activa_id')
      sessionStorage.removeItem('area_activa_nombre')
      sessionStorage.removeItem('profile')
    }
  }

  /**
   * Sincroniza perfil desde backend (usuarios.cargo_id es la fuente de verdad).
   * - 1 cargo: backend lo persiste automáticamente
   * - N cargos sin cargo_id: muestra modal de selección
   */
  const isUsuarioNoRegistradoError = (error: unknown): boolean => {
    const err = error as {
      statusCode?: number
      status?: number
      response?: { status?: number }
      data?: { statusCode?: number; message?: string | string[] }
      message?: string
    }
    const status = err?.statusCode ?? err?.status ?? err?.response?.status ?? err?.data?.statusCode
    if (status === 404) return true

    const msg = Array.isArray(err?.data?.message)
      ? err.data.message.join(' ')
      : err?.data?.message || err?.message || ''
    return /no encontrado|not found/i.test(String(msg))
  }

  const fetchProfile = async (): Promise<ProfileDto | null> => {
    if (!import.meta.client) return null

    loading.value = true
    const accessDenied = useState<boolean>('access-denied', () => false)

    try {
      const resp = await backendService.get<ProfileDto>('profile')
      if (!resp?.data) {
        return loadProfileFromStorage()
      }

      accessDenied.value = false
      const apiData = resp.data
      const numCargos = apiData.cargos?.length || 0
      const cargoId = apiData.cargo_id ?? null
      const fullProfile = buildLocalProfile(apiData, cargoId)

      if (numCargos > 1 && !cargoId) {
        needsCargoSelection.value = true
        profile.value = fullProfile
        return fullProfile
      }

      needsCargoSelection.value = false
      saveProfileToStorage(fullProfile)
      return fullProfile
    } catch (error) {
      console.error('Error fetching profile from backend:', error)
      if (isUsuarioNoRegistradoError(error)) {
        accessDenied.value = true
        clearProfile()
        throw error
      }
      return loadProfileFromStorage()
    } finally {
      loading.value = false
    }
  }

  const resolveCargoOrigenId = (): string | null => {
    if (!import.meta.client) {
      return profile.value?.cargo_activo_id || profile.value?.cargo_id || null
    }
    const fromOrigen = localStorage.getItem(CARGO_ORIGEN_STORAGE_KEY)
    if (fromOrigen) return fromOrigen
    const fromActivo = localStorage.getItem('cargo_activo_id')
    if (fromActivo) return fromActivo
    return profile.value?.cargo_activo_id || profile.value?.cargo_id || null
  }

  const setCargoOrigenId = (cargoId: string) => {
    if (!import.meta.client) return
    localStorage.setItem(CARGO_ORIGEN_STORAGE_KEY, cargoId)
  }

  /**
   * Persiste cargo activo en usuarios.cargo_id (PATCH profile/cargo-activo)
   */
  const setCargoActivo = async (cargoId: string) => {
    const resp = await backendService.patch<ProfileDto>(
      'profile',
      'cargo-activo',
      { cargo_id: cargoId },
    )
    const data = (resp as RespuestaApi<ProfileDto>)?.data ?? (resp as unknown as ProfileDto)
    const fullProfile = buildLocalProfile(data, data.cargo_id ?? cargoId)
    saveProfileToStorage(fullProfile)
    setCargoOrigenId(cargoId)
    needsCargoSelection.value = false
    return fullProfile
  }

  const cargoOrigenId = computed(() => resolveCargoOrigenId())

  const cargoOrigen = computed(() => {
    const id = cargoOrigenId.value
    if (!id || !profile.value?.cargos?.length) return null
    return profile.value.cargos.find((c) => c.id === id) ?? null
  })

  const cargoActivo = computed(() => {
    if (!profile.value || !profile.value.cargos?.length) return null
    const id = profile.value.cargo_activo_id || profile.value.cargo_id
    if (id) {
      const found = profile.value.cargos.find((c) => c.id === id)
      if (found) return found
    }
    return profile.value.cargos[0] || null
  })

  const areaActiva = computed(() => cargoActivo.value?.area ?? null)

  return {
    profile,
    cargoActivo,
    cargoOrigenId,
    cargoOrigen,
    areaActiva,
    resolveCargoOrigenId,
    setCargoOrigenId,
    loading,
    needsCargoSelection,
    fetchProfile,
    loadProfileFromStorage,
    saveProfileToStorage,
    setCargoActivo,
    clearProfile,
  }
}
