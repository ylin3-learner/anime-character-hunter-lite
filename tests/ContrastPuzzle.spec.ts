import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ContrastPuzzle from '../src/components/ContrastPuzzle.vue';

describe('ContrastPuzzle', () => {
  const props = {
    chineseSentence: '穿藍色制服的女孩',
    chineseHighlight: '穿藍色制服的',
    nounImage: 'girl.png',
    modifierImage: 'uniform.png',
    englishNoun: 'The girl',
    modifierLabel: 'who wears a blue uniform',
    tiles: ['wears', 'uniform', 'who', 'blue', 'a'],
    correctAnswer: ['who', 'wears', 'a', 'blue', 'uniform'],
    antecedent: { noun: 'The girl', number: 'singular', person: 'person' } as const
  };

  it('第一階段：顯示中文句子、高亮修飾語、與兩個空格與兩張拼圖', () => {
    const wrapper = mount(ContrastPuzzle, { props });
    
    // 驗證中文句子與高亮
    expect(wrapper.find('.chinese-display h2').text()).toContain('穿藍色制服的女孩');
    expect(wrapper.find('.highlight').text()).toBe('穿藍色制服的');
    
    // 驗證有兩個空白槽位 (Slot A & Slot B)
    const slots = wrapper.findAll('.slot');
    expect(slots).toHaveLength(2);
    
    // 驗證有兩張可拖拽的圖 (因為 class 已改為 .puzzle-piece)
    const puzzlePieces = wrapper.findAll('.puzzle-piece');
    expect(puzzlePieces).toHaveLength(2);
  });
});