import { api } from './client';
import { FollowEntry, PublicProfile, User } from '../types';

export async function fetchPublicProfile(id: string): Promise<PublicProfile> {
  const { data } = await api.get<PublicProfile>(`/users/${id}`);
  return data;
}

export async function updateProfile(input: { username: string }) {
  const { data } = await api.patch('/users/me', input);
  return data;
}

// Mismo patron de FormData que uploadPhoto (api/photos.ts) -- RN arma el
// multipart a partir de {uri, name, type}, no hay Blob/File real aca.
export async function uploadAvatar(uri: string): Promise<User> {
  const filename = uri.split('/').pop() ?? `avatar-${Date.now()}.jpg`;
  const ext = filename.split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const form = new FormData();
  form.append('file', { uri, name: filename, type: mime } as any);

  const { data } = await api.post<User>('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAvatar(): Promise<User> {
  const { data } = await api.delete<User>('/users/me/avatar');
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
