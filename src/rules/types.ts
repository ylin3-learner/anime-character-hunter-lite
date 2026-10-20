export type DiagnosticCode =
  | 'DUPLICATE_PRONOUN'   // who she wears：關代後重複代名詞
  | 'SV_AGREEMENT'        // the boys who lives：動詞與先行詞不一致
  | 'WRONG_RELATIVE'      // 人用 which／物用 who（that 兩者皆可）
  | 'NOT_REDUCED'         // 轉換題仍保留 who／which／that
  | 'INCOMPLETE_REDUCTION'; // 新增：轉換題刪了關代卻留下 be 動詞

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