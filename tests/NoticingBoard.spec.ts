import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NoticingBoard from '../src/components/NoticingBoard.vue';

describe('NoticingBoard', () => {
  const props = {
    data: {
      examples: ['The girl who wears a uniform.', 'The boy who plays basketball.'],
      question: 'who 代替的是什麼？',
      options: [
        { text: '事物', isCorrect: false },
        { text: '人', isCorrect: true }
      ],
      explanation: '當先行詞是「人」時，使用 who。'
    }
  };

  it('渲染出例句與問題', () => {
    const wrapper = mount(NoticingBoard, { props });
    expect(wrapper.text()).toContain('The girl who wears a uniform.');
    expect(wrapper.text()).toContain('who 代替的是什麼？');
  });

  it('點擊錯誤選項會變紅，點擊正確選項會顯示解釋並觸發 complete', async () => {
    const wrapper = mount(NoticingBoard, { props });
    const options = wrapper.findAll('.option-btn');
    
    // 點擊錯誤選項
    await options[0].trigger('click');
    expect(options[0].classes()).toContain('wrong');

    // 點擊正確選項
    await options[1].trigger('click');
    expect(options[1].classes()).toContain('correct');
    expect(wrapper.find('.explanation').exists()).toBe(true);
    
    // 點擊繼續
    await wrapper.find('.btn-continue').trigger('click');
    expect(wrapper.emitted('complete')).toBeTruthy();
  });
});