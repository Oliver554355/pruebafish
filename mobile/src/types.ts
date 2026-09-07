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

export type AnimalSpecies = 'PERRO' | 'GATO' | 'AVE' | 'OTRO';
export type AnimalSex = 'MACHO' | 'HEMBRA' | 'DESCONOCIDO';
export type SaleCondition = 'NUEVO' | 'USADO';

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

export interface Comment {
  id: string;
  content: string;
  rating: number | null;
  authorId: string;
  postId: string | null;
  businessId: string | null;
  createdAt: string;
  author: { id: string; username: string };
}

export interface FeedPost extends NearbyPost {
  reactionCount: number;
  commentCount: number;
  score: number;
}

export interface AnimalDetails {
  species: AnimalSpecies;
  petName: string | null;
  color: string | null;
  characteristics: string | null;
  sex: AnimalSex | null;
  approxAgeYears: number | null;
  adoptionConditions: string | null;
  contactPhone: string | null;
}

export interface EventDetails {
  startsAt: string;
  organizerName: string | null;
}

export interface SaleDetails {
  price: string;
  currency: string;
  condition: SaleCondition | null;
  sold: boolean;
}

export interface PostDetail extends NearbyPost {
  author: { id: string; username: string };
  photos: Photo[];
  animalDetails: AnimalDetails | null;
  eventDetails: EventDetails | null;
  saleDetails: SaleDetails | null;
}

export interface Photo {
  id: string;
  url: string;
  postId: string | null;
  businessId: string | null;
  productId: string | null;
  uploadedById: string;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: string | null;
  photos: Photo[];
  createdAt: string;
}

export type BusinessClaimStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface BusinessClaim {
  id: string;
  businessId: string;
  userId: string;
  message: string | null;
  status: BusinessClaimStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; username: string };
  business: { id: string; name: string };
}

export interface BusinessDetail {
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
  photos: Photo[];
  rating: { average: number | null; count: number };
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
