import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MicroTileUnscramble from '../src/components/MicroTileUnscramble.vue';

describe('MicroTileUnscramble', () => {
  const antecedent = { noun: 'The girl', number: 'singular', person: 'person' } as const;
  
  // 共用的預設資料
  const defaultProps = {
    initialTiles: ['who', 'wears', 'a', 'blue', 'uniform'],
    antecedent,
    correctAnswer: ['who', 'wears', 'a', 'blue', 'uniform'] // 補上這個就解決紅線了
  };

  it('渲染出所有打散的字磚', () => {
    const wrapper = mount(MicroTileUnscramble, { props: defaultProps });
    const wordBankTiles = wrapper.findAll('[data-test="word-bank"] [data-test="tile"]');
    expect(wordBankTiles).toHaveLength(5);
  });

  it('點擊字磚後，會移動到作答區', async () => {
    const wrapper = mount(MicroTileUnscramble, { props: defaultProps });
    
    const firstTile = wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')[0];
    await firstTile.trigger('click');

    expect(wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')).toHaveLength(4);
    const answerTiles = wrapper.findAll('[data-test="answer-area"] [data-test="tile"]');
    expect(answerTiles).toHaveLength(1);
    expect(answerTiles[0].text()).toBe('who');
  });

  it('作答區字磚可以點擊退回', async () => {
    const wrapper = mount(MicroTileUnscramble, { props: defaultProps });
    
    await wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')[0].trigger('click');
    await wrapper.findAll('[data-test="answer-area"] [data-test="tile"]')[0].trigger('click');

    expect(wrapper.findAll('[data-test="word-bank"] [data-test="tile"]')).toHaveLength(5);
    expect(wrapper.findAll('[data-test="answer-area"] [data-test="tile"]')).toHaveLength(0);
  });

  it('排列出迷思句型時，對應字磚變色並顯示警示', async () => {
    // 故意給錯誤題目
    const badTiles = ['who', 'she', 'wears', 'a', 'uniform'];
    const wrapper = mount(MicroTileUnscramble, {
      props: { ...defaultProps, initialTiles: badTiles }
    });

    const tiles = wrapper.findAll('[data-test="word-bank"] [data-test="tile"]');
    for (const tile of tiles) {
      await tile.trigger('click');
    }

    const answerTiles = wrapper.findAll('[data-test="answer-area"] [data-test="tile"]');
    expect(answerTiles[1].classes()).toContain('tile-error'); // she
    expect(wrapper.find('[data-test="alert-bubble"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="alert-bubble"]').text()).toContain('不可重複喔');
  });

  it('❌ 即使沒有觸發迷思規則，字序不對也不能算成功', async () => {
    const wrapper = mount(MicroTileUnscramble, {
      props: { 
        ...defaultProps,
        initialTiles: ['a', 'uniform', 'who', 'blue', 'wears']
      }
    });

    // 故意排成 who -> a -> blue -> uniform -> wears
    const clickOrder = ['who', 'a', 'blue', 'uniform', 'wears'];
    for (const word of clickOrder) {
      const tile = wrapper.findAll('[data-test="word-bank"] [data-test="tile"]').find(t => t.text() === word);
      await tile?.trigger('click');
    }

    // 沒有文法錯誤提示
    expect(wrapper.find('[data-test="alert-bubble"]').exists()).toBe(false);
    // 但也不該觸發 success
    expect(wrapper.emitted('success')).toBeFalsy();
    const answerTiles = wrapper.findAll('[data-test="answer-area"] [data-test="tile"]');
    expect(answerTiles[0].classes()).not.toContain('tile-success');
  });
});