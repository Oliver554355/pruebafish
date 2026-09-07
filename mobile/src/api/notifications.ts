import { api } from './client';

export async function registerPushToken(token: string) {
  await api.post('/notifications/register-token', { token });
}

export async function unregisterPushToken(token: string) {
  await api.delete('/notifications/register-token', { data: { token } });
}
