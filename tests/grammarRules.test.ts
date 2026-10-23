import { describe, it, expect } from 'vitest';
import { validatePostModifier } from '../src/rules/grammarRules';
import type { Antecedent } from '../src/rules/types';

const boy: Antecedent = { noun: 'boy', number: 'singular', person: 'person' };
const girls: Antecedent = { noun: 'girls', number: 'plural', person: 'person' };
const pin: Antecedent = { noun: 'pin', number: 'singular', person: 'thing' };
const church: Antecedent = { noun: 'church', number: 'singular', person: 'thing' };
const people: Antecedent = { noun: 'people', number: 'plural', person: 'person' };
const line: Antecedent = { noun: 'line', number: 'singular', person: 'thing' };
const ball: Antecedent = { noun: 'ball', number: 'singular', person: 'thing' };

const codes = (r: { code: string }[]) => r.map(s => s.code);
const t = (s: string) => s.split(' ');

describe('WRONG_RELATIVE', () => {
  it('物用 who → 觸發', () => {
    expect(codes(validatePostModifier(t('The church who has a big red door'), church)))
      .toEqual(['WRONG_RELATIVE']);
  });
  it('人用 which → 觸發', () => {
    expect(codes(validatePostModifier(t('The boy which is looking up words'), boy)))
      .toEqual(['WRONG_RELATIVE']);
  });
  it('that 人與物皆可', () => {
    expect(validatePostModifier(t('The boy that is looking up words'), boy)).toEqual([]);
    expect(validatePostModifier(t('The pin that caught Ella\'s eye'), pin)).toEqual([]);
  });
  it('正確句不誤報', () => {
    expect(validatePostModifier(t('The boy who is looking up words is Peter'), boy)).toEqual([]);
    expect(validatePostModifier(t('The pin which caught Ella\'s eye was on sale'), pin)).toEqual([]);
  });
});

describe('舊規則維持不變', () => {
  it('who she → DUPLICATE_PRONOUN', () => {
    expect(codes(validatePostModifier(t('The boy who she is looking up words'), boy)))
      .toContain('DUPLICATE_PRONOUN');
  });
  it('the boys who lives → SV_AGREEMENT', () => {
    expect(codes(validatePostModifier(t('The girls who is playing baseball'), girls)))
      .toEqual(['SV_AGREEMENT']);
  });
  it('只放一個 who（無其他錯）不會重複觸發', () => {
    expect(validatePostModifier(t('The boy who lives next door'), boy)).toEqual([]);
  });
});

describe('新增動詞對（課本 p.98／p.107）', () => {
  it('people who have（複數）正確；people who has 錯誤', () => {
    expect(validatePostModifier(t('people who have a great interest'), people)).toEqual([]);
    expect(codes(validatePostModifier(t('people who has a great interest'), people)))
      .toEqual(['SV_AGREEMENT']);
  });
  it('the line that leads（單數）正確；lead 錯誤', () => {
    expect(validatePostModifier(t('the line that leads to that booth'), line)).toEqual([]);
    expect(codes(validatePostModifier(t('the line that lead to that booth'), line)))
      .toEqual(['SV_AGREEMENT']);
  });
  it('was/were', () => {
    expect(codes(validatePostModifier(t('The girls who was making noise'), girls)))
      .toEqual(['SV_AGREEMENT']);
  });
});

describe('reduce 模式（轉換題）', () => {
  it('保留 that is → NOT_REDUCED（而不是無聲通過）', () => {
    const r = validatePostModifier(t('The ball that is under the chair is dirty'), ball, { mode: 'reduce' });
    expect(codes(r)).toEqual(['NOT_REDUCED']);
    expect(r[0].index).toBe(2);
  });
  it('已簡化 → 無訊號', () => {
    expect(validatePostModifier(t('The ball under the chair is dirty'), ball, { mode: 'reduce' })).toEqual([]);
  });
  it('who has → with 也適用', () => {
    expect(codes(validatePostModifier(t('The man who has big eyes is Ken'), boy, { mode: 'reduce' })))
      .toEqual(['NOT_REDUCED']);
  });
  it('reduce 模式不會夾帶其他規則', () => {
    expect(codes(validatePostModifier(t('The ball which she is under the chair'), ball, { mode: 'reduce' })))
      .toEqual(['NOT_REDUCED']);
  });
  it('預設模式不受影響', () => {
    expect(validatePostModifier(t('The ball that is under the chair is dirty'), ball)).toEqual([]);
  });
});

describe('reduce 模式：正解不可被誤報（回歸測試）', () => {
  it.each([
    'The ball under the chair is dirty',
    'The man with big eyes is Ken',
    'My mom is the woman in a long skirt',
    'I know the cosplayer in a cat costume',
    'Do you know the writer with a dictionary',
    'The car with two doors is expensive',
  ])('%s → 無訊號', s => {
    expect(codes(validatePostModifier(t(s), ball, { mode: 'reduce' }))).toEqual([]);
  });
});

describe('reduce 模式：殘留 be 動詞', () => {
  it('只拿掉 that、留下 is → INCOMPLETE_REDUCTION，指向第一個 is', () => {
    const r = validatePostModifier(t('The ball is under the chair is dirty'), ball, { mode: 'reduce' });
    expect(codes(r)).toEqual(['INCOMPLETE_REDUCTION']);
    expect(r[0].index).toBe(2);
  });
  it('仍有關代時優先回報 NOT_REDUCED，不夾帶 INCOMPLETE_REDUCTION', () => {
    expect(codes(validatePostModifier(t('The ball that is under the chair is dirty'), ball, { mode: 'reduce' })))
      .toEqual(['NOT_REDUCED']);
  });
});

// 👈 新增：片語塊 (Chunking) 測試
describe('片語塊 (Chunking) 測試', () => {
  it('包含片語塊的正確句子不應報錯', () => {
    // 模擬傳入帶中括號的 Token
    const chunkedTiles = ['The', 'boy', 'who', 'is', '[looking up words]', 'is', 'Peter'];
    expect(validatePostModifier(chunkedTiles, boy)).toEqual([]);
  });

  it('片語塊內含關鍵字不應觸發誤判', () => {
    // 假設片語塊內有 who，但語法引擎不應把它當成關係代名詞，因為它在 [] 內
    const chunkedTiles = ['The', 'boy', '[who is wearing a blue uniform]', 'is', 'Peter'];
    // 由於 cleanToken 會拔掉中括號，但不會拆開裡面的字，所以 findVerbPair 找不到對應動詞，應跳過
    expect(validatePostModifier(chunkedTiles, boy)).toEqual([]);
  });

  it('reduce 模式遇到片語塊正解不誤報', () => {
    const chunkedTiles = ['The', 'boy', '[in a blue uniform]', 'is', 'Peter'];
    expect(validatePostModifier(chunkedTiles, boy, { mode: 'reduce' })).toEqual([]);
  });
});