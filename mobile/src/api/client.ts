import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// EXPO_PUBLIC_* se inyecta en build time desde mobile/.env (ver .env.example).
// Con Expo Go en un celular fisico esto NO puede ser "localhost": tiene que
// ser la IP de la maquina que corre el backend en la misma red (ver README).
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'chosica_token';

export function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function setToken(token: string) {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function clearToken() {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
