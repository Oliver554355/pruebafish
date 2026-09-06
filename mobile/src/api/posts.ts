import { api } from './client';
import { FeedPost, NearbyPost, PostCategory } from '../types';

export async function fetchNearbyPosts(
  lat: number,
  lng: number,
  radius = 3000,
  category?: PostCategory,
): Promise<NearbyPost[]> {
  const { data } = await api.get<NearbyPost[]>('/posts/nearby', {
    params: { lat, lng, radius, category },
  });
  return data;
}

export async function fetchFeed(
  lat: number,
  lng: number,
  radius = 3000,
): Promise<FeedPost[]> {
  const { data } = await api.get<FeedPost[]>('/posts/feed', {
    params: { lat, lng, radius },
  });
  return data;
}

export interface CreatePostInput {
  category: PostCategory;
  title: string;
  description?: string;
  lat: number;
  lng: number;
}

export async function createPost(input: CreatePostInput) {
  const { data } = await api.post('/posts', input);
  return data;
}
