import { PostCategory } from './types';

// Colores por categoria (brief seccion 4.1: "los marcadores deben poder
// diferenciarse visualmente segun su categoria"). Sin diseño definido
// todavia — esta paleta es provisoria, para distinguir categorias en el
// mapa/feed, no una decision de marca.
export const CATEGORY_COLORS: Record<PostCategory, string> = {
  ACCIDENTE: '#dc2626',
  INCIDENTE: '#ea580c',
  ANIMAL_PERDIDO: '#7c3aed',
  ANIMAL_ENCONTRADO: '#9333ea',
  ADOPCION: '#c026d3',
  RECOMENDACION: '#16a34a',
  EVENTO: '#2563eb',
  AVISO: '#ca8a04',
  VENTA: '#0891b2',
  OTRO: '#6b7280',
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
