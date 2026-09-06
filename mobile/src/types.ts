// Espejo minimo de los enums/DTOs del backend (backend/prisma/schema.prisma).
// Si se agrega una categoria o campo nuevo alla, actualizar aca tambien.

export type PostCategory =
  | 'ACCIDENTE'
  | 'INCIDENTE'
  | 'ANIMAL_PERDIDO'
  | 'ANIMAL_ENCONTRADO'
  | 'ADOPCION'
  | 'RECOMENDACION'
  | 'EVENTO'
  | 'AVISO'
  | 'VENTA'
  | 'OTRO';

export type BusinessCategory =
  | 'RESTAURANTE'
  | 'TIENDA'
  | 'HOSTAL'
  | 'PARQUE'
  | 'TURISMO'
  | 'FARMACIA'
  | 'SALUD'
  | 'EDUCACION'
  | 'BANCO_CAJERO'
  | 'PARADA'
  | 'OTRO';

export interface User {
  id: string;
  email: string;
  username: string;
  isModerator: boolean;
  followedCategories: PostCategory[];
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  createdAt: string;
  postsCount: number;
  commentsCount: number;
  followersCount: number;
  followingCount: number;
  reputation: {
    score: number;
    breakdown: Record<string, number>;
  };
}

export interface NearbyPost {
  id: string;
  category: PostCategory;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  authorId: string;
  createdAt: string;
  expiresAt: string | null;
  distance: number;
}

export interface FeedPost extends NearbyPost {
  reactionCount: number;
  commentCount: number;
  score: number;
}

export interface NearbyBusiness {
  id: string;
  category: BusinessCategory;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
  lat: number;
  lng: number;
  createdById: string;
  ownerId: string | null;
  verified: boolean;
  createdAt: string;
  distance: number;
}
