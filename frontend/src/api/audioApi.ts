import client from './client';
import type { AudioItem, PdfContent } from '../types';

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

export const getPdfContent = async (id: number): Promise<PdfContent> => {
  const res = await client.get(`/api/audio/${id}/pdf`);
  return res.data;
};

export const scanAudio = async (): Promise<AudioItem[]> => {
  const res = await client.post('/api/audio/scan');
  return res.data;
};
