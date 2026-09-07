import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimalSex, AnimalSpecies, BusinessCategory, PostCategory, SaleCondition } from './types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Colores por categoria (brief seccion 4.1: "los marcadores deben poder
// diferenciarse visualmente segun su categoria"), afinados para el tema
// oscuro (ver theme.ts): saturados para que hagan "pop" sobre el fondo
// #0B1220 en vez de verse apagados.
export const CATEGORY_COLORS: Record<PostCategory, string> = {
  ACCIDENTE: '#EF4444',
  INCIDENTE: '#F97316',
  ANIMAL_PERDIDO: '#A855F7',
  ANIMAL_ENCONTRADO: '#C026D3',
  ADOPCION: '#EC4899',
  RECOMENDACION: '#22C55E',
  EVENTO: '#3B82F6',
  AVISO: '#EAB308',
  VENTA: '#06B6D4',
  OTRO: '#64748B',
};

export const CATEGORY_ICONS: Record<PostCategory, IoniconName> = {
  ACCIDENTE: 'car-sport',
  INCIDENTE: 'alert-circle',
  ANIMAL_PERDIDO: 'paw',
  ANIMAL_ENCONTRADO: 'paw',
  ADOPCION: 'heart',
  RECOMENDACION: 'star',
  EVENTO: 'calendar',
  AVISO: 'megaphone',
  VENTA: 'pricetag',
  OTRO: 'ellipsis-horizontal',
};

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  ACCIDENTE: 'Accidente',
  INCIDENTE: 'Incidente',
  ANIMAL_PERDIDO: 'Animal perdido',
  ANIMAL_ENCONTRADO: 'Animal encontrado',
  ADOPCION: 'Adopción',
  RECOMENDACION: 'Recomendación',
  EVENTO: 'Evento',
  AVISO: 'Aviso',
  VENTA: 'Venta',
  OTRO: 'Otro',
};

export const ANIMAL_SPECIES_LABELS: Record<AnimalSpecies, string> = {
  PERRO: 'Perro',
  GATO: 'Gato',
  AVE: 'Ave',
  OTRO: 'Otro',
};

export const ANIMAL_SEX_LABELS: Record<AnimalSex, string> = {
  MACHO: 'Macho',
  HEMBRA: 'Hembra',
  DESCONOCIDO: 'No sé',
};

export const SALE_CONDITION_LABELS: Record<SaleCondition, string> = {
  NUEVO: 'Nuevo',
  USADO: 'Usado',
};

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  RESTAURANTE: 'Restaurante',
  TIENDA: 'Tienda',
  HOSTAL: 'Hostal',
  PARQUE: 'Parque',
  TURISMO: 'Turismo',
  FARMACIA: 'Farmacia',
  SALUD: 'Salud',
  EDUCACION: 'Educación',
  BANCO_CAJERO: 'Banco / Cajero',
  PARADA: 'Parada',
  OTRO: 'Otro',
};

export const BUSINESS_CATEGORY_COLORS: Record<BusinessCategory, string> = {
  RESTAURANTE: '#F97316',
  TIENDA: '#3B82F6',
  HOSTAL: '#8B5CF6',
  PARQUE: '#22C55E',
  TURISMO: '#06B6D4',
  FARMACIA: '#EF4444',
  SALUD: '#EC4899',
  EDUCACION: '#EAB308',
  BANCO_CAJERO: '#14B8A6',
  PARADA: '#64748B',
  OTRO: '#64748B',
};

export const BUSINESS_CATEGORY_ICONS: Record<BusinessCategory, IoniconName> = {
  RESTAURANTE: 'restaurant',
  TIENDA: 'storefront',
  HOSTAL: 'bed',
  PARQUE: 'leaf',
  TURISMO: 'camera',
  FARMACIA: 'medkit',
  SALUD: 'medical',
  EDUCACION: 'school',
  BANCO_CAJERO: 'cash',
  PARADA: 'bus',
  OTRO: 'ellipsis-horizontal',
};
