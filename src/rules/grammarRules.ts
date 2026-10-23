import type { Antecedent, DiagnosticSignal } from './types';
import { findVerbPair, expectedForm } from './verbTable';

const RELATIVE_PRONOUNS = new Set(['who', 'which', 'that']);
const SUBJECT_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const BE_VERBS = new Set(['is', 'are', 'was', 'were', 'am']);

// 輔助函數：清除片語塊的中括號，讓語法引擎能正確讀取
const cleanToken = (text: string) => text.replace(/[\[\]]/g, '').toLowerCase();

export function assertNoDuplicatePronoun(tiles: string[]): DiagnosticSignal[] {
  const signals: DiagnosticSignal[] = [];
  for (let i = 0; i < tiles.length - 1; i++) {
    const cur = cleanToken(tiles[i]);
    const next = cleanToken(tiles[i + 1]);
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

export function assertSVAgreement(tiles: string[], antecedent: Antecedent): DiagnosticSignal[] {
  const signals: DiagnosticSignal[] = [];
  for (let i = 0; i < tiles.length - 1; i++) {
    const cur = cleanToken(tiles[i]);
    if (!RELATIVE_PRONOUNS.has(cur)) continue;

    let j = i + 1;
    while (j < tiles.length && SUBJECT_PRONOUNS.has(cleanToken(tiles[j]))) {
      j++;
    }
    if (j >= tiles.length) continue;

    const verb = cleanToken(tiles[j]);
    const pair = findVerbPair(verb);
    if (!pair) continue;

    const expected = expectedForm(pair, antecedent.number);
    if (verb !== expected) {
      signals.push({
        code: 'SV_AGREEMENT',
        index: j,
        message: `先行詞「${antecedent.noun}」是${antecedent.number === 'singular' ? '單數' : '複數'}，動詞要用「${expected}」`,
        hint: `把「${tiles[j]}」改成「${expected}」`,
      });
    }
  }
  return signals;
}

export function assertRelativeChoice(tiles: string[], antecedent: Antecedent): DiagnosticSignal[] {
  const signals: DiagnosticSignal[] = [];
  tiles.forEach((tile, i) => {
    const t = cleanToken(tile);
    if (t === 'who' && antecedent.person === 'thing') {
      signals.push({
        code: 'WRONG_RELATIVE',
        index: i,
        message: `「${antecedent.noun}」是物，不能用「${tile}」`,
        hint: `先行詞是物 → 用 which（或 that）`,
      });
    } else if (t === 'which' && antecedent.person === 'person') {
      signals.push({
        code: 'WRONG_RELATIVE',
        index: i,
        message: `「${antecedent.noun}」是人，不能用「${tile}」`,
        hint: `先行詞是人 → 用 who（或 that）`,
      });
    }
  });
  return signals;
}

export function assertReduced(tiles: string[]): DiagnosticSignal[] {
  const idx = tiles.findIndex(t => RELATIVE_PRONOUNS.has(cleanToken(t)));
  if (idx === -1) return [];
  return [
    {
      code: 'NOT_REDUCED',
      index: idx,
      message: `這題要把關係子句簡化成介系詞片語，「${tiles[idx]}」要拿掉喔！`,
      hint: `關代＋be 動詞可以一起省略（that is under → under）；who has → with`,
    },
  ];
}

const PREPOSITIONS = new Set([
  'in', 'on', 'at', 'under', 'behind', 'with', 'by', 'next', 'across',
  'near', 'from', 'over', 'above', 'beside', 'between', 'inside', 'outside',
]);

export function assertNoLeftoverBe(tiles: string[]): DiagnosticSignal[] {
  const hasRelative = tiles.some(t => RELATIVE_PRONOUNS.has(cleanToken(t)));
  if (hasRelative) return [];

  const beIndex = tiles.findIndex(
    (t, i) =>
      BE_VERBS.has(cleanToken(t)) &&
      i + 1 < tiles.length &&
      PREPOSITIONS.has(cleanToken(tiles[i + 1]))
  );
  if (beIndex === -1) return [];

  return [
    {
      code: 'INCOMPLETE_REDUCTION',
      index: beIndex,
      message: `「${tiles[beIndex]}」是多餘的喔！`,
      hint: `關代和 be 動詞要一起省略。請把「${tiles[beIndex]}」拿掉。`,
    },
  ];
}

export interface ValidateOptions {
  mode?: 'build' | 'reduce';
}

export function validatePostModifier(
  tiles: string[],
  antecedent: Antecedent,
  options: ValidateOptions = {}
): DiagnosticSignal[] {
  if (tiles.length === 0) return [];

  if (options.mode === 'reduce') {
    const notReduced = assertReduced(tiles);
    if (notReduced.length > 0) return notReduced;
    return assertNoLeftoverBe(tiles);
  }

  return [
    ...assertNoDuplicatePronoun(tiles),
    ...assertSVAgreement(tiles, antecedent),
    ...assertRelativeChoice(tiles, antecedent),
  ];
}