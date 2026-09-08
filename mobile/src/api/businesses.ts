import { api } from './client';
import { BusinessCategory, BusinessDetail, MyBusiness, NearbyBusiness } from '../types';

export const BUSINESSES_PAGE_SIZE = 20;

export async function fetchNearbyBusinesses(
  lat: number,
  lng: number,
  radius = 3000,
  category?: BusinessCategory,
  offset = 0,
): Promise<NearbyBusiness[]> {
  const { data } = await api.get<NearbyBusiness[]>('/businesses/nearby', {
    params: { lat, lng, radius, category, offset, limit: BUSINESSES_PAGE_SIZE },
  });
  return data;
}

export async function fetchBusiness(id: string): Promise<BusinessDetail> {
  const { data } = await api.get<BusinessDetail>(`/businesses/${id}`);
  return data;
}

// Points que el usuario logueado creo o de los que quedo como dueño --
// atajo desde el perfil (ver ProfileScreen "Mis negocios") para
// administrarlos sin tener que buscarlos en Explorar.
export async function fetchMyBusinesses(): Promise<MyBusiness[]> {
  const { data } = await api.get<MyBusiness[]>('/businesses/mine');
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

// Autoverificacion desde el panel del dueño/creador -- sin moderador de
// por medio, ver businesses.service.ts#verify en el backend.
export async function verifyBusiness(id: string): Promise<BusinessDetail> {
  const { data } = await api.patch<BusinessDetail>(`/businesses/${id}/verify`);
  return data;
}
