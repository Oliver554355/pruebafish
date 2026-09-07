import { api } from './client';
import { Product } from '../types';

export async function fetchProducts(businessId: string): Promise<Product[]> {
  const { data } = await api.get<Product[]>('/products', {
    params: { businessId },
  });
  return data;
}

export interface ProductInput {
  businessId: string;
  name: string;
  description?: string;
  price?: number;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await api.post<Product>('/products', input);
  return data;
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<ProductInput, 'businessId'>>,
): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}`, input);
  return data;
}

export async function deleteProduct(id: string) {
  await api.delete(`/products/${id}`);
}
