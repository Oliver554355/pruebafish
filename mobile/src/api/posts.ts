import { api } from './client';
import {
  AnimalSex,
  AnimalSpecies,
  FeedPost,
  NearbyPost,
  PostCategory,
  PostDetail,
  SaleCondition,
} from '../types';

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

export async function fetchPost(id: string): Promise<PostDetail> {
  const { data } = await api.get<PostDetail>(`/posts/${id}`);
  return data;
}

export const FEED_PAGE_SIZE = 20;

export async function fetchFeed(
  lat: number,
  lng: number,
  radius = 3000,
  offset = 0,
): Promise<FeedPost[]> {
  const { data } = await api.get<FeedPost[]>('/posts/feed', {
    params: { lat, lng, radius, offset, limit: FEED_PAGE_SIZE },
  });
  return data;
}

export interface CreatePostInput {
  category: PostCategory;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  animal?: {
    species: AnimalSpecies;
    petName?: string;
    color?: string;
    characteristics?: string;
    sex?: AnimalSex;
    approxAgeYears?: number;
    adoptionConditions?: string;
    contactPhone?: string;
  };
  event?: {
    startsAt: string;
    organizerName?: string;
  };
  sale?: {
    price: number;
    currency?: string;
    condition?: SaleCondition;
  };
}

export async function createPost(input: CreatePostInput) {
  const { data } = await api.post('/posts', input);
  return data;
}

export async function markPostSold(id: string) {
  const { data } = await api.patch(`/posts/${id}/mark-sold`);
  return data;
}
