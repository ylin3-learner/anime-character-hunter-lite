import { describe, it, expect } from 'vitest';
import {
    assertNoDuplicatePronoun,
    assertSVAgreement,
    validatePostModifier,
} from '../src/rules/grammarRules';
import type { Antecedent } from '../src/rules/types';

// ─────────────────────────────────────────────
// 迷思 1：關係代名詞後重複出現主格代名詞
// ─────────────────────────────────────────────
describe('assertNoDuplicatePronoun', () => {
    it('✅ 接受正確句：who wears a blue uniform', () => {
        expect(
            assertNoDuplicatePronoun(['who', 'wears', 'a', 'blue', 'uniform'])
        ).toEqual([]);
    });

    it('❌ 抓到 who + she', () => {
        const signals = assertNoDuplicatePronoun([
            'who', 'she', 'wears', 'a', 'blue', 'uniform',
        ]);
        expect(signals).toHaveLength(1);
        expect(signals[0].code).toBe('DUPLICATE_PRONOUN');
        expect(signals[0].index).toBe(1); // she 在第 1 格
    });

    it('❌ 抓到 which + it（物）', () => {
        const signals = assertNoDuplicatePronoun(['which', 'it', 'has', 'wheels']);
        expect(signals[0].code).toBe('DUPLICATE_PRONOUN');
    });

    it('❌ 大小寫不敏感：Who + She', () => {
        const signals = assertNoDuplicatePronoun(['Who', 'She', 'wears']);
        expect(signals).toHaveLength(1);
    });

    it('✅ 主格代名詞不在關代後面時，不誤報', () => {
        // "she wears" — 沒有關代，不該觸發
        expect(assertNoDuplicatePronoun(['she', 'wears', 'a', 'uniform'])).toEqual([]);
    });
});

// ─────────────────────────────────────────────
// 迷思 2：關係子句主動詞單複數一致性
// ─────────────────────────────────────────────
describe('assertSVAgreement', () => {
    const singularGirl: Antecedent = {
        noun: 'The girl',
        number: 'singular',
        person: 'person',
    };
    const pluralGirls: Antecedent = {
        noun: 'The girls',
        number: 'plural',
        person: 'person',
    };

    it('✅ 單數先行詞 + wears', () => {
        expect(
            assertSVAgreement(['who', 'wears', 'a', 'uniform'], singularGirl)
        ).toEqual([]);
    });

    it('❌ 單數先行詞 + wear', () => {
        const s = assertSVAgreement(['who', 'wear', 'a', 'uniform'], singularGirl);
        expect(s).toHaveLength(1);
        expect(s[0].code).toBe('SV_AGREEMENT');
        expect(s[0].message).toContain('wears');
    });

    it('✅ 複數先行詞 + wear', () => {
        expect(
            assertSVAgreement(['who', 'wear', 'blue', 'uniforms'], pluralGirls)
        ).toEqual([]);
    });

    it('❌ 複數先行詞 + wears', () => {
        const s = assertSVAgreement(['who', 'wears', 'blue', 'uniforms'], pluralGirls);
        expect(s[0].code).toBe('SV_AGREEMENT');
        expect(s[0].message).toContain('wear');
    });

    it('❌ 關代後被插入冗餘代名詞時，仍要檢查後方動詞', () => {
        // 學生寫：who she wear a blue uniform
        const signals = assertSVAgreement(
            ['who', 'she', 'wear', 'a', 'blue', 'uniform'],
            singularGirl
        );
        expect(signals).toHaveLength(1);
        expect(signals[0].code).toBe('SV_AGREEMENT');
        expect(signals[0].index).toBe(2); // 指向 wear，不是 she
    });

    it('✅ 不認識的動詞不誤報', () => {
        expect(
            assertSVAgreement(['who', 'scribbles', 'stuff'], singularGirl)
        ).toEqual([]);
    });
});

// ─────────────────────────────────────────────
// 整合入口：validatePostModifier
// ─────────────────────────────────────────────
describe('validatePostModifier (integration)', () => {
    const girl: Antecedent = { noun: 'The girl', number: 'singular', person: 'person' };

    it('✅ 完整正確句：who wears a blue uniform', () => {
        const signals = validatePostModifier(
            ['who', 'wears', 'a', 'blue', 'uniform'],
            girl
        );
        expect(signals).toEqual([]);
    });

    it('❌ 同時踩兩個雷：who she wears', () => {
        const signals = validatePostModifier(['who', 'she', 'wear', 'a', 'uniform'], girl);
        const codes = signals.map(s => s.code);
        expect(codes).toContain('DUPLICATE_PRONOUN');
        expect(codes).toContain('SV_AGREEMENT');
    });

    it('❌ 空陣列直接回傳空', () => {
        expect(validatePostModifier([], girl)).toEqual([]);
    });
});