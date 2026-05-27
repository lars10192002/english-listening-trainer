import client from './client';
import type { Transcript, TranscriptImportResult, TranscriptSegment } from '../types';

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

export const importPdfTranscript = async (audioId: number): Promise<TranscriptImportResult> => {
  const res = await client.post(`/api/transcripts/import-pdf/${audioId}`);
  return res.data;
};

export const importSrtTranscript = async (audioId: number): Promise<TranscriptImportResult> => {
  const res = await client.post(`/api/transcripts/import-srt/${audioId}`);
  return res.data;
};

export const getSegmentsByAudio = async (audioId: number): Promise<TranscriptSegment[]> => {
  const res = await client.get(`/api/transcripts/audio/${audioId}/segments`);
  return res.data;
};

export const alignTimestamps = async (audioId: number): Promise<{ updated: number; total: number }> => {
  const res = await client.post(`/api/transcripts/align/${audioId}`, {}, { timeout: 600000 });
  return res.data;
};
