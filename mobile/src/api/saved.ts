import { api } from './client';
import { Page, SavedItem } from '../types';

export async function toggleSaved(input: {
  postId?: string;
  businessId?: string;
}): Promise<{ saved: boolean }> {
  const { data } = await api.post('/saved', input);
  return data;
}

export async function fetchSaved(cursor?: string): Promise<Page<SavedItem>> {
  const { data } = await api.get<Page<SavedItem>>('/saved', { params: { cursor } });
  return data;
}
