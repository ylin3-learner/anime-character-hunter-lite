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

  it('第一階段：顯示中文句子、高亮修飾語、與兩張拼圖', () => {
    const wrapper = mount(ContrastPuzzle, { props });
    
    expect(wrapper.find('[data-test="chinese-sentence"]').text()).toContain('穿藍色制服的女孩');
    expect(wrapper.find('[data-test="highlight"]').text()).toBe('穿藍色制服的');
    
    const puzzlePieces = wrapper.findAll('[data-test="puzzle-piece"]');
    expect(puzzlePieces).toHaveLength(2);
  });

  it('點擊拼圖後，進入第二階段（合體並顯示英文與字磚）', async () => {
    const wrapper = mount(ContrastPuzzle, { props });
    
    // 點擊拼圖合體
    await wrapper.find('[data-test="merge-btn"]').trigger('click');
    
    // 中文應該隱藏，英文作答區應該出現
    expect(wrapper.find('[data-test="chinese-sentence"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="english-noun"]').text()).toBe('The girl');
    
    // 應該渲染出 MicroTileUnscramble 組件
    expect(wrapper.findComponent({ name: 'MicroTileUnscramble' }).exists()).toBe(true);
  });
});