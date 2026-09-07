import { api } from './client';
import { Comment, Page } from '../types';

export async function fetchComments(params: {
  postId?: string;
  businessId?: string;
  cursor?: string;
}): Promise<Page<Comment>> {
  const { data } = await api.get<Page<Comment>>('/comments', { params });
  return data;
}

export interface CreateCommentInput {
  content: string;
  postId?: string;
  businessId?: string;
  rating?: number;
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  const { data } = await api.post<Comment>('/comments', input);
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  await api.delete(`/comments/${id}`);
}
