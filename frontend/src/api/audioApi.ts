import client from './client';
import type { AudioItem } from '../types';

export const uploadAudio = async (formData: FormData): Promise<AudioItem> => {
  const res = await client.post('/api/audio/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const listAudio = async (params?: Record<string, string | number>): Promise<AudioItem[]> => {
  const res = await client.get('/api/audio', { params });
  return res.data;
};

export const getAudio = async (id: number): Promise<AudioItem> => {
  const res = await client.get(`/api/audio/${id}`);
  return res.data;
};

export const deleteAudio = async (id: number): Promise<void> => {
  await client.delete(`/api/audio/${id}`);
};
