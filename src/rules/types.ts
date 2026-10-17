export type DiagnosticCode =
  | 'DUPLICATE_PRONOUN'
  | 'SV_AGREEMENT';

export interface DiagnosticSignal {
  code: DiagnosticCode;
  index: number;          // 出錯的 tile 索引
  message: string;        // 顯示給學生的中文提示
  hint?: string;
}

export interface Antecedent {
  noun: string;
  number: 'singular' | 'plural';
  person: 'person' | 'thing';
}