import type { ProfileDto } from '~/types/profile'
import { backendService } from '~/services/backend.service'

export const useProfile = () => {
  const profile = useState<ProfileDto | null>('profile', () => null)
  const loading = useState<boolean>('profile-loading', () => false)

  const fetchProfile = async () => {
    if (!import.meta.client) return

    loading.value = true
    try {
      const resp = await backendService.get<ProfileDto>('profile')
      if (resp && resp.data) {
        profile.value = resp.data
        sessionStorage.setItem('profile', JSON.stringify(profile.value))
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      const stored = sessionStorage.getItem('profile')
      if (stored) {
        try {
          profile.value = JSON.parse(stored)
        } catch {
          // ignore parsing error
        }
      }
    } finally {
      loading.value = false
    }
  }

  const loadProfileFromStorage = () => {
    if (import.meta.client) {
      const stored = sessionStorage.getItem('profile')
      if (stored) {
        try {
          profile.value = JSON.parse(stored)
        } catch {
          // ignore
        }
      }
    }
  }

  const clearProfile = () => {
    profile.value = null
    if (import.meta.client) {
      sessionStorage.removeItem('profile')
    }
  }

  return {
    profile,
    loading,
    fetchProfile,
    loadProfileFromStorage,
    clearProfile
  }
}
