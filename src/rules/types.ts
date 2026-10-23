export type DiagnosticCode =
  | 'DUPLICATE_PRONOUN' | 'SV_AGREEMENT' | 'WRONG_RELATIVE'
  | 'NOT_REDUCED' | 'INCOMPLETE_REDUCTION';

export interface DiagnosticSignal {
  code: DiagnosticCode;
  index: number;
  message: string;
  hint?: string;
}

export interface Antecedent {
  noun: string;
  number: 'singular' | 'plural';
  person: 'person' | 'thing';
}

export interface QuestionData {
  id: string;
  type: 'standard' | 'contrast' | 'chunk'; // 👈 新增 chunk 題型
  mode?: 'build' | 'reduce'; 
  enabledStages?: ('input' | 'macro' | 'micro' | 'pronunciation' | 'noticing')[];
  targetNoun: string;
  antecedent: Antecedent;
  imageUrl: string;
  tags?: string[];
  grammarFeature: {
    relative: { label: string; tiles: string[]; correctAnswer: string[]; distractors?: string[] };
    preposition: { label: string; tiles: string[]; correctAnswer: string[] };
  };
  explanation?: { title: string; desc: string };
  inputData?: {
    audioText: string;
    options: { image: string; text: string; isCorrect: boolean }[];
  };
  noticingData?: any;
  contextCloze?: { prefix: string; suffix: string };
  contrastData?: any;
  
  // chunk 題型專屬資料
  previewData?: {
    targetImage: string;
    targetNoun: string;
    chunkText: string;
    chunkZh: string;
    quizOptions?: { text: string; isCorrect: boolean }[]; 
  };
}