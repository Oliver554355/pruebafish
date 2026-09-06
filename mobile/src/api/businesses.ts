import { api } from './client';
import { BusinessCategory, NearbyBusiness } from '../types';

export async function fetchNearbyBusinesses(
  lat: number,
  lng: number,
  radius = 3000,
  category?: BusinessCategory,
): Promise<NearbyBusiness[]> {
  const { data } = await api.get<NearbyBusiness[]>('/businesses/nearby', {
    params: { lat, lng, radius, category },
  });
  return data;
}
