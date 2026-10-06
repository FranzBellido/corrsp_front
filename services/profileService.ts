import { backendService } from './backendService';
import type { ProfileDto } from '../types/profile';
import type { RespuestaApi } from '~/types/respuestas';

export const profileService = {
  getProfile: async (): Promise<RespuestaApi<ProfileDto>> => {
    return await backendService.get<ProfileDto>('/profile');
  }
};
