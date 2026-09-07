import { api } from './client';
import { Photo } from '../types';

export interface UploadPhotoTarget {
  postId?: string;
  businessId?: string;
  productId?: string;
}

// React Native no tiene Blob real desde una uri local: se arma el FormData
// con {uri, name, type} y RN lo convierte al multipart correcto (mismo
// patron que se usa en toda la comunidad Expo, no hay File/Blob nativo aca).
export async function uploadPhoto(
  uri: string,
  target: UploadPhotoTarget,
): Promise<Photo> {
  const filename = uri.split('/').pop() ?? `photo-${Date.now()}.jpg`;
  const ext = filename.split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const form = new FormData();
  form.append('file', { uri, name: filename, type: mime } as any);
  if (target.postId) form.append('postId', target.postId);
  if (target.businessId) form.append('businessId', target.businessId);
  if (target.productId) form.append('productId', target.productId);

  const { data } = await api.post<Photo>('/photos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deletePhoto(id: string) {
  await api.delete(`/photos/${id}`);
}
