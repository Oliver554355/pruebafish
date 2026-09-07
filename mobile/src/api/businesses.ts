import { api } from './client';
import { BusinessCategory, BusinessDetail, NearbyBusiness } from '../types';

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

export async function fetchBusiness(id: string): Promise<BusinessDetail> {
  const { data } = await api.get<BusinessDetail>(`/businesses/${id}`);
  return data;
}

export interface CreateBusinessInput {
  category: BusinessCategory;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  hours?: string;
  lat: number;
  lng: number;
}

export async function createBusiness(input: CreateBusinessInput) {
  const { data } = await api.post('/businesses', input);
  return data;
}

export type UpdateBusinessInput = Partial<
  Omit<CreateBusinessInput, 'category' | 'lat' | 'lng'>
>;

export async function updateBusiness(id: string, input: UpdateBusinessInput) {
  const { data } = await api.patch(`/businesses/${id}`, input);
  return data;
}
