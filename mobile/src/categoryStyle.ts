import { AnimalSex, AnimalSpecies, BusinessCategory, PostCategory, SaleCondition } from './types';
import { GlyphName } from './pixelIcons';

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

export const CATEGORY_PIXEL_ICON: Record<PostCategory, GlyphName> = {
  ACCIDENTE: 'CAR',
  INCIDENTE: 'EXCLAIM',
  ANIMAL_PERDIDO: 'PAW',
  ANIMAL_ENCONTRADO: 'PAW',
  ADOPCION: 'HEART',
  RECOMENDACION: 'STAR',
  EVENTO: 'CALENDAR',
  AVISO: 'MEGAPHONE',
  VENTA: 'TAG',
  OTRO: 'DOTS',
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

export const BUSINESS_CATEGORY_PIXEL_ICON: Record<BusinessCategory, GlyphName> = {
  RESTAURANTE: 'FORK',
  TIENDA: 'SHOP',
  HOSTAL: 'BED',
  PARQUE: 'TREE',
  TURISMO: 'CAMERA',
  FARMACIA: 'CROSS_SOLID',
  SALUD: 'CROSS_HOLLOW',
  EDUCACION: 'CAP',
  BANCO_CAJERO: 'COIN',
  PARADA: 'BUS',
  OTRO: 'DOTS',
};
