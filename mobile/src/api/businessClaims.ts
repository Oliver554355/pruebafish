import { api } from './client';
import { BusinessClaim, BusinessClaimStatus } from '../types';

export async function createBusinessClaim(input: {
  businessId: string;
  message?: string;
}) {
  const { data } = await api.post('/business-claims', input);
  return data;
}

// Solo para moderadores (ModeratorGuard en el backend).
export async function fetchBusinessClaims(
  status?: BusinessClaimStatus,
): Promise<BusinessClaim[]> {
  const { data } = await api.get<BusinessClaim[]>('/business-claims', {
    params: { status },
  });
  return data;
}

export async function reviewBusinessClaim(
  id: string,
  status: 'APROBADO' | 'RECHAZADO',
) {
  const { data } = await api.patch(`/business-claims/${id}`, { status });
  return data;
}
