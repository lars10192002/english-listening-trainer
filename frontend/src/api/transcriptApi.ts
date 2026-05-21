import client from './client';
import type { Transcript } from '../types';

export const createTranscript = async (data: {
  audio_id: number;
  content: string;
  format?: string;
}): Promise<Transcript> => {
  const res = await client.post('/api/transcripts', data);
  return res.data;
};

export const getTranscriptsByAudio = async (audioId: number): Promise<Transcript[]> => {
  const res = await client.get(`/api/transcripts/audio/${audioId}`);
  return res.data;
};

export const updateTranscript = async (id: number, data: Partial<Transcript>): Promise<Transcript> => {
  const res = await client.put(`/api/transcripts/${id}`, data);
  return res.data;
};

export const deleteTranscript = async (id: number): Promise<void> => {
  await client.delete(`/api/transcripts/${id}`);
};
