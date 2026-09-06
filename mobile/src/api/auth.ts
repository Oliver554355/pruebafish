import { api, setToken } from './client';
import { User } from '../types';

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; username: string };
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  await setToken(data.accessToken);
  return fetchMe();
}

export async function register(
  email: string,
  username: string,
  password: string,
): Promise<User> {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    email,
    username,
    password,
  });
  await setToken(data.accessToken);
  return fetchMe();
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me');
  return data;
}
