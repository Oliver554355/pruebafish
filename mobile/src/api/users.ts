import { api } from './client';
import { PublicProfile } from '../types';

export async function fetchPublicProfile(id: string): Promise<PublicProfile> {
  const { data } = await api.get<PublicProfile>(`/users/${id}`);
  return data;
}

export async function updateProfile(input: { username: string }) {
  const { data } = await api.patch('/users/me', input);
  return data;
}
