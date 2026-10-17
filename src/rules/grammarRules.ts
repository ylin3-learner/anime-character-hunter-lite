import type { Antecedent, DiagnosticSignal } from './types';
import { findVerbPair, expectedForm } from './verbTable';

const RELATIVE_PRONOUNS = new Set(['who', 'which', 'that']);

const SUBJECT_PRONOUNS = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
]);

// 只列 Unit 5 會出現的動詞對，避免亂猜
// const VERB_PAIRS: Array<{ singular: string; plural: string }> = [
//   { singular: 'wears', plural: 'wear' },
//   { singular: 'has',   plural: 'have' },
//   { singular: 'is',    plural: 'are'  },
//   { singular: 'lives', plural: 'live' },
//   { singular: 'likes', plural: 'like' },
//   { singular: 'plays', plural: 'play' },
//   { singular: 'shakes',plural: 'shake'},
// ];

// function pairOf(verb: string) {
//   return VERB_PAIRS.find(p => p.singular === verb || p.plural === verb);
// }

// ── Rule 1：who/which/that 後面不能接主格代名詞
export function assertNoDuplicatePronoun(tiles: string[]): DiagnosticSignal[] {
  const signals: DiagnosticSignal[] = [];
  for (let i = 0; i < tiles.length - 1; i++) {
    const cur  = tiles[i].toLowerCase();
    const next = tiles[i + 1].toLowerCase();
    if (RELATIVE_PRONOUNS.has(cur) && SUBJECT_PRONOUNS.has(next)) {
      signals.push({
        code: 'DUPLICATE_PRONOUN',
        index: i + 1,
        message: `「${tiles[i]}」已經代替了「${tiles[i + 1]}」，不可重複喔！`,
        hint: `刪掉「${tiles[i + 1]}」，改成「${tiles[i]} + 動詞」`,
      });
    }
  }
  return signals;
}

// ── Rule 2：關係子句裡的主動詞要和先行詞單複數一致
export function assertSVAgreement(
  tiles: string[],
  antecedent: Antecedent
): DiagnosticSignal[] {
  const signals: DiagnosticSignal[] = [];

  for (let i = 0; i < tiles.length - 1; i++) {
    const cur = tiles[i].toLowerCase();
    if (!RELATIVE_PRONOUNS.has(cur)) continue;

    let j = i + 1;
    while (j < tiles.length && SUBJECT_PRONOUNS.has(tiles[j].toLowerCase())) {
      j++;
    }
    if (j >= tiles.length) continue;

    const verb = tiles[j].toLowerCase();
    const pair = findVerbPair(verb);
    if (!pair) continue;

    const expected = expectedForm(pair, antecedent.number);

    if (verb !== expected) {
      signals.push({
        code: 'SV_AGREEMENT',
        index: j,
        message: `先行詞「${antecedent.noun}」是${
          antecedent.number === 'singular' ? '單數' : '複數'
        }，動詞要用「${expected}」`,
        hint: `把「${tiles[j]}」改成「${expected}」`,
      });
    }
  }
  return signals;
}

// ── 整合入口
export function validatePostModifier(
  tiles: string[],
  antecedent: Antecedent
): DiagnosticSignal[] {
  if (tiles.length === 0) return [];
  return [
    ...assertNoDuplicatePronoun(tiles),
    ...assertSVAgreement(tiles, antecedent),
  ];
}