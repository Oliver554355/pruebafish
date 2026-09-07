import { api } from './client';
import { SearchResults } from '../types';

export async function search(q: string): Promise<SearchResults> {
  const { data } = await api.get<SearchResults>('/search', { params: { q } });
  return data;
}
