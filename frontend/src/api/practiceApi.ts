import client from './client';
import type { DictationResult, FillBlankResult, MultipleChoiceResult, RolePlayResult, PracticeRecord, DashboardStats } from '../types';

export const submitDictation = async (data: {
  audio_id: number;
  segment_id?: number;
  user_input: string;
}): Promise<DictationResult> => {
  const res = await client.post('/api/practice/dictation/submit', data);
  return res.data;
};

export const submitFillBlank = async (data: {
  question_id: number;
  user_answer: string;
}): Promise<FillBlankResult> => {
  const res = await client.post('/api/practice/fill-blank/submit', data);
  return res.data;
};

export const submitMultipleChoice = async (data: {
  question_id: number;
  selected_option_id: number;
}): Promise<MultipleChoiceResult> => {
  const res = await client.post('/api/practice/multiple-choice/submit', data);
  return res.data;
};

export const submitRolePlay = async (data: {
  audio_id: number;
  role: string;
  answers: { segment_id: number; user_input: string }[];
}): Promise<RolePlayResult> => {
  const res = await client.post('/api/practice/role-play/submit', data);
  return res.data;
};

export const getReviewRecords = async (params?: {
  exam_type?: string;
  mode?: string;
  mistake_type?: string;
  limit?: number;
  offset?: number;
}): Promise<PracticeRecord[]> => {
  const res = await client.get('/api/review', { params });
  return res.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await client.get('/api/stats/dashboard');
  return res.data;
};
