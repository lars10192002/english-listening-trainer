import client from './client';
import type { Question } from '../types';

export const createQuestion = async (data: Omit<Question, 'id' | 'options'> & {
  options?: { option_label: string; option_text: string; is_correct: boolean }[];
}): Promise<Question> => {
  const res = await client.post('/api/questions', data);
  return res.data;
};

export const getQuestionsByAudio = async (audioId: number): Promise<Question[]> => {
  const res = await client.get(`/api/questions/audio/${audioId}`);
  return res.data;
};

export const deleteQuestion = async (id: number): Promise<void> => {
  await client.delete(`/api/questions/${id}`);
};
