import type { ProfileDto } from '~/types/profile'
import { backendService } from '~/services/backend.service'

const PROFILE_STORAGE_KEY = 'user_profile_data'

export const useProfile = () => {
  const profile = useState<ProfileDto | null>('profile', () => null)
  const loading = useState<boolean>('profile-loading', () => false)

  /**
   * Sincroniza área activa en sessionStorage
   */
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

  /**
   * Carga el perfil almacenado en localStorage si existe
   */
  const loadProfileFromStorage = (): ProfileDto | null => {
    if (!import.meta.client) return null
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ProfileDto
        profile.value = parsed

        // Sincronizar también sessionStorage por si se abre una nueva pestaña/sesión
        syncSessionArea(parsed.area_activa_id, parsed.area_activa_nombre)

        return parsed
      } catch (e) {
        console.error('Error parsing stored profile:', e)
      }
    }
    return null
  }

  /**
   * Guarda el perfil completo en localStorage y el área activa en sessionStorage
   */
  const saveProfileToStorage = (updatedProfile: ProfileDto) => {
    // Si tiene un cargo_activo_id, calcular su área correspondiente si no vino calculada
    if (updatedProfile.cargo_activo_id && updatedProfile.cargos?.length) {
      const cargoMatch = updatedProfile.cargos.find(c => c.id === updatedProfile.cargo_activo_id)
      if (cargoMatch?.area) {
        updatedProfile.area_activa_id = cargoMatch.area.id
        updatedProfile.area_activa_nombre = cargoMatch.area.nombre
      } else if (cargoMatch?.area_id) {
        updatedProfile.area_activa_id = cargoMatch.area_id
      }
    }

    profile.value = updatedProfile

    if (import.meta.client) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile))
      if (updatedProfile.cargo_activo_id) {
        localStorage.setItem('cargo_activo_id', updatedProfile.cargo_activo_id)
      }
      if (updatedProfile.area_activa_id) {
        localStorage.setItem('area_activa_id', updatedProfile.area_activa_id)
      }
      syncSessionArea(updatedProfile.area_activa_id, updatedProfile.area_activa_nombre)
    }
  }

  // Bandera para indicar si se requiere que el usuario escoja cargo entre múltiples opciones
  const needsCargoSelection = useState<boolean>('needs-cargo-selection', () => false)

  /**
   * Obtiene el perfil desde la API del backend.
   * Reglas de negocio:
   * 1. Si no hay info en localStorage y solo tiene 1 cargo -> se almacena automáticamente y continúa.
   * 2. Si no hay info en localStorage y tiene 2 o más cargos -> activa needsCargoSelection para mostrar el modal.
   * 3. Si ya tiene cargo seleccionado en localStorage -> se preserva y continúa.
   */
  const fetchProfile = async (): Promise<ProfileDto | null> => {
    if (!import.meta.client) return null

    loading.value = true
    try {
      const resp = await backendService.get<ProfileDto>('profile')
      if (resp && resp.data) {
        const apiData = resp.data
        const existingStored = loadProfileFromStorage()

        const numCargos = apiData.cargos?.length || 0

        // Verificar si el cargo previamente guardado aún existe en sus cargos actuales
        let defaultCargoId = existingStored?.cargo_activo_id
        const cargoExists = apiData.cargos?.some(c => c.id === defaultCargoId)

        if (!cargoExists) {
          defaultCargoId = null
        }

        // Si no hay cargo seleccionado previamente guardado
        if (!defaultCargoId) {
          if (numCargos === 1 && apiData.cargos?.[0]) {
            // Caso 1: Solo tiene 1 cargo -> guardar directamente en localStorage
            defaultCargoId = apiData.cargos[0].id
            needsCargoSelection.value = false
          } else if (numCargos > 1) {
            // Caso 2: Tiene 2 o más cargos -> requerir selección mediante modal
            needsCargoSelection.value = true
          } else {
            // No tiene cargos asignados
            needsCargoSelection.value = false
          }
        } else {
          // Ya tenía selección previa en localStorage
          needsCargoSelection.value = false
        }

        let areaId: string | null = null
        let areaNombre: string | null = null

        if (defaultCargoId && apiData.cargos?.length) {
          const cargoMatch = apiData.cargos.find(c => c.id === defaultCargoId)
          if (cargoMatch?.area) {
            areaId = cargoMatch.area.id
            areaNombre = cargoMatch.area.nombre
          } else if (cargoMatch?.area_id) {
            areaId = cargoMatch.area_id
          }
        }

        const fullProfile: ProfileDto = {
          ...apiData,
          cargo_activo_id: defaultCargoId,
          area_activa_id: areaId,
          area_activa_nombre: areaNombre
        }

        if (defaultCargoId || numCargos <= 1) {
          saveProfileToStorage(fullProfile)
        } else {
          profile.value = fullProfile
        }

        return fullProfile
      }
    } catch (error) {
      console.error('Error fetching profile from backend:', error)
      return loadProfileFromStorage()
    } finally {
      loading.value = false
    }

    return null
  }

  /**
   * Selecciona el cargo activo de trabajo y actualiza localStorage y sessionStorage
   */
  const setCargoActivo = (cargoId: string) => {
    if (!profile.value) return

    let areaId: string | null = null
    let areaNombre: string | null = null
    const cargoMatch = profile.value.cargos?.find(c => c.id === cargoId)
    if (cargoMatch?.area) {
      areaId = cargoMatch.area.id
      areaNombre = cargoMatch.area.nombre
    } else if (cargoMatch?.area_id) {
      areaId = cargoMatch.area_id
    }

    const updated: ProfileDto = {
      ...profile.value,
      cargo_activo_id: cargoId,
      area_activa_id: areaId,
      area_activa_nombre: areaNombre
    }
    saveProfileToStorage(updated)
    needsCargoSelection.value = false
  }

  /**
   * Limpia toda la información del perfil de memoria, localStorage y sessionStorage
   */
  const clearProfile = () => {
    profile.value = null
    needsCargoSelection.value = false
    if (import.meta.client) {
      localStorage.removeItem(PROFILE_STORAGE_KEY)
      localStorage.removeItem('cargo_activo_id')
      localStorage.removeItem('area_activa_id')
      sessionStorage.removeItem('area_activa_id')
      sessionStorage.removeItem('area_activa_nombre')
      sessionStorage.removeItem('profile')
    }
  }

  /**
   * Retorna el cargo actualmente activo
   */
  const cargoActivo = computed(() => {
    if (!profile.value || !profile.value.cargos?.length) return null
    if (profile.value.cargo_activo_id) {
      const found = profile.value.cargos.find(c => c.id === profile.value?.cargo_activo_id)
      if (found) return found
    }
    return profile.value.cargos[0] || null
  })

  /**
   * Retorna el área actualmente activa
   */
  const areaActiva = computed(() => {
    if (cargoActivo.value?.area) {
      return cargoActivo.value.area
    }
    return null
  })

  return {
    profile,
    cargoActivo,
    areaActiva,
    loading,
    needsCargoSelection,
    fetchProfile,
    loadProfileFromStorage,
    saveProfileToStorage,
    setCargoActivo,
    clearProfile
  }
}
