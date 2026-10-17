import { describe, it, expect } from 'vitest';
import { findVerbPair, expectedForm } from '../src/rules/verbTable';

describe('verbTable', () => {
  it('找到單數動詞的 pair', () => {
    const pair = findVerbPair('wears');
    expect(pair).toEqual({ singular: 'wears', plural: 'wear' });
  });

  it('找到複數動詞的 pair', () => {
    const pair = findVerbPair('wear');
    expect(pair).toEqual({ singular: 'wears', plural: 'wear' });
  });

  it('大小寫不敏感', () => {
    expect(findVerbPair('WEARS')).toEqual({ singular: 'wears', plural: 'wear' });
  });

  it('不認識的動詞回傳 undefined', () => {
    expect(findVerbPair('scribbles')).toBeUndefined();
  });

  it('expectedForm 依先行詞數回傳正確形', () => {
    const pair = findVerbPair('wear')!;
    expect(expectedForm(pair, 'singular')).toBe('wears');
    expect(expectedForm(pair, 'plural')).toBe('wear');
  });
});