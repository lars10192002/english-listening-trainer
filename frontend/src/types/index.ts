export interface AudioItem {
  id: number;
  filename: string;
  file_path: string;
  title?: string;
  exam_type: string;
  category?: string;
  ielts_section?: number;
  toeic_part?: number;
  topic?: string;
  difficulty?: string;
  speaker_accent?: string;
  duration_seconds?: number;
  created_at?: string;
}

export interface Transcript {
  id: number;
  audio_id: number;
  content: string;
  language: string;
  format: string;
  created_at?: string;
}

export interface TranscriptSegment {
  id: number;
  transcript_id: number;
  audio_id: number;
  segment_index: number;
  speaker?: string;
  start_time_seconds?: number;
  end_time_seconds?: number;
  text: string;
}

export interface TranscriptImportResult {
  transcript_id: number;
  audio_id: number;
  segment_count: number;
  speakers: string[];
  segments: TranscriptSegment[];
}

export interface QuestionOption {
  id: number;
  question_id: number;
  option_label: string;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  id: number;
  audio_id: number;
  segment_id?: number;
  question_type: string;
  question_text?: string;
  correct_answer: string;
  answer_type?: string;
  word_limit_type?: string;
  explanation?: string;
  paraphrase_note?: string;
  options: QuestionOption[];
}

export interface MistakeDetail {
  mistake_type: string;
  wrong_text?: string;
  correct_text?: string;
  explanation?: string;
}

export interface DictationResult {
  score: number;
  word_error_rate: number;
  correct_answer: string;
  user_input: string;
  mistakes: MistakeDetail[];
  practice_record_id: number;
}

export interface FillBlankResult {
  is_correct: boolean;
  score: number;
  correct_answer: string;
  user_answer: string;
  mistakes: MistakeDetail[];
  practice_record_id: number;
}

export interface MultipleChoiceResult {
  is_correct: boolean;
  correct_option_id: number;
  explanation?: string;
  practice_record_id: number;
}

export interface Mistake {
  id: number;
  practice_record_id: number;
  mistake_type: string;
  wrong_text?: string;
  correct_text?: string;
  explanation?: string;
  created_at?: string;
}

export interface PracticeRecord {
  id: number;
  audio_id: number;
  question_id?: number;
  mode: string;
  user_input?: string;
  correct_answer?: string;
  is_correct?: boolean;
  score?: number;
  word_error_rate?: number;
  mistake_summary?: string;
  created_at?: string;
  mistakes: Mistake[];
  audio?: AudioItem;
}

export interface DashboardStats {
  today_practice_count: number;
  average_score: number;
  pending_review_count: number;
  recent_mistake_types: { type: string; count: number }[];
  exam_type_distribution: { exam_type: string; count: number }[];
}

export interface VocabItem {
  word: string;
  pos: string;
  definition: string;
}

export interface PdfContent {
  title: string;
  dialogue: string;
  key_vocabulary: VocabItem[];
  supplementary_vocabulary: VocabItem[];
}

export type ExamType = 'ielts' | 'toeic' | 'custom' | 'business' | 'general';
export type PracticeMode = 'dictation' | 'fill_blank' | 'multiple_choice' | 'number_drill' | 'paraphrase';
