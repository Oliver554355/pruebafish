import { api } from './client';
import { FollowEntry, PublicProfile } from '../types';

export async function fetchPublicProfile(id: string): Promise<PublicProfile> {
  const { data } = await api.get<PublicProfile>(`/users/${id}`);
  return data;
}

export async function updateProfile(input: { username: string }) {
  const { data } = await api.patch('/users/me', input);
  return data;
}

export async function toggleFollow(userId: string): Promise<{ following: boolean }> {
  const { data } = await api.post(`/users/${userId}/follow`);
  return data;
}

export async function fetchFollowers(userId: string): Promise<FollowEntry[]> {
  const { data } = await api.get<FollowEntry[]>(`/users/${userId}/followers`);
  return data;
}

export async function fetchFollowing(userId: string): Promise<FollowEntry[]> {
  const { data } = await api.get<FollowEntry[]>(`/users/${userId}/following`);
  return data;
}

// Para las notificaciones push de "algo paso cerca tuyo" (ver
// NotificationsService.sendToNearby en el backend).
export async function updateMyLocation(lat: number, lng: number) {
  await api.patch('/users/me/location', { lat, lng });
}
