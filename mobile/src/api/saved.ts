import { api } from './client';
import { SavedItem } from '../types';

export async function toggleSaved(input: {
  postId?: string;
  businessId?: string;
}): Promise<{ saved: boolean }> {
  const { data } = await api.post('/saved', input);
  return data;
}

export async function fetchSaved(): Promise<SavedItem[]> {
  const { data } = await api.get<SavedItem[]>('/saved');
  return data;
}
