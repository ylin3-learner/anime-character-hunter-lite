import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MicroTileUnscramble from '../src/components/MicroTileUnscramble.vue';

describe('MicroTileUnscramble', () => {
  const antecedent = { noun: 'The girl', number: 'singular', person: 'person' } as const;
  // 正解：who wears a blue uniform
  const initialTiles = ['who', 'wears', 'a', 'blue', 'uniform'];

  it('渲染出所有打散的字磚', () => {
    const wrapper = mount(MicroTileUnscramble, {
      props: { initialTiles, antecedent }
    });
    const wordBankTiles = wrapper.findAll('[data-test="word-bank"] [data-test="tile"]');
    expect(wordBankTiles).toHaveLength(5);
  });

  it('點擊字磚後，會移動到作答區', async () => {
    const wrapper = mount(MicroTileUnscramble, {
      props: { initialTiles, antecedent }
    });
    
    // 點擊第一個字磚 "who"
    const firstTile = wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')[0];
    await firstTile.trigger('click');

    // 檢查 word-bank 剩下 4 個，answer-area 出現 1 個
    expect(wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')).toHaveLength(4);
    const answerTiles = wrapper.findAll('[data-test="answer-area"] [data-test="tile"]');
    expect(answerTiles).toHaveLength(1);
    expect(answerTiles[0].text()).toBe('who');
  });

  it('作答區字磚可以點擊退回', async () => {
    const wrapper = mount(MicroTileUnscramble, {
      props: { initialTiles, antecedent }
    });
    
    // 加入再退回
    await wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')[0].trigger('click');
    await wrapper.findAll('[data-test="answer-area"] [data-test="tile"]')[0].trigger('click');

    expect(wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')).toHaveLength(5);
    expect(wrapper.findAll('[data-test="answer-area"] [data-test="tile"]')).toHaveLength(0);
  });

  it('排列出迷思句型時，對應字磚變色並顯示警示', async () => {
    // 故意給錯誤題目：who she wears a uniform
    const badTiles = ['who', 'she', 'wears', 'a', 'uniform'];
    const wrapper = mount(MicroTileUnscramble, {
      props: { initialTiles: badTiles, antecedent }
    });

    // 快速點擊全部字磚，模擬學生排出 "who she wears a uniform"
    const tiles = wrapper.findAll('[data-test="word-bank"] [data-test="tile"]');
    for (const tile of tiles) {
      await tile.trigger('click');
    }

    // 檢查 DOM
    const answerTiles = wrapper.findAll('[data-test="answer-area"] [data-test="tile"]');
    
    // 第 2 個字 (index 1) 是 "she"，應該要有 error class
    expect(answerTiles[1].classes()).toContain('tile-error');
    // 第 3 個字 (index 2) 是 "wears"，因為 who she 已經佔用，SV 檢查應該也會報錯，但我們先確認有錯誤提示區塊
    expect(wrapper.find('[data-test="alert-bubble"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="alert-bubble"]').text()).toContain('不可重複喔');
  });
});