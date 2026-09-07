import { api } from './client';

export interface ReactionSummaryItem {
  type: string;
  count: number;
}

export async function fetchReactionSummary(params: {
  postId?: string;
  businessId?: string;
}): Promise<ReactionSummaryItem[]> {
  const { data } = await api.get<ReactionSummaryItem[]>('/reactions/summary', {
    params,
  });
  return data;
}

// El backend hace toggle: si ya habias reaccionado, la quita; si no, la crea.
export async function toggleReaction(params: {
  postId?: string;
  businessId?: string;
}): Promise<{ reacted: boolean }> {
  const { data } = await api.post<{ reacted: boolean }>('/reactions', params);
  return data;
}
