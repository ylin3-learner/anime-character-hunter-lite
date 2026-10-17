import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MacroDragCanvas from '../src/components/MacroDragCanvas.vue';

describe('MacroDragCanvas', () => {
  // 更新 Props 以符合 Sprint 4 的雙文法與圖片結構
  const props = {
    targetNoun: 'The girl',
    imageUrl: 'dummy-url.svg',
    modifiers: {
      relative: { label: 'who wears a blue uniform' },
      preposition: { label: 'in a blue uniform' }
    }
  };

  it('渲染出目標名詞與可拖曳圖塊', () => {
    const wrapper = mount(MacroDragCanvas, { props });
    
    expect(wrapper.find('[data-test="target-noun"]').text()).toBe('The girl');
    const draggable = wrapper.find('[data-test="draggable-block"]');
    expect(draggable.exists()).toBe(true);
    expect(draggable.attributes('draggable')).toBe('true');
    
    // 預設應該是 relative 模式的 label
    expect(draggable.text()).toContain('who wears a blue uniform');
  });

  it('將圖塊拖放到合法區域後，進入解鎖狀態（觸發 unpack 事件）', async () => {
    const wrapper = mount(MacroDragCanvas, { props });
    
    // 模擬拖曳事件 (拖曳開始)
    await wrapper.find('[data-test="draggable-block"]').trigger('dragstart');
    
    // 模擬放入目標區 (Drop)
    const dropZone = wrapper.find('[data-test="drop-zone"]');
    await dropZone.trigger('dragover');
    await dropZone.trigger('drop');

    // 驗證 UI 狀態改變
    expect(wrapper.find('[data-test="target-noun"]').text()).toContain('The girl');
    
    // 驗證是否觸發了通知父元件解包的 emit
    // 因為現在 emit 傳遞的是型態 ('relative' | 'preposition')，不再是字串句子
    expect(wrapper.emitted()).toHaveProperty('unpack');
    expect(wrapper.emitted('unpack')![0]).toEqual(['relative']);
  });

  it('圖塊如果放在非目標區，不會觸發 unpack', async () => {
    const wrapper = mount(MacroDragCanvas, { props });
    
    // 模擬放到背景
    await wrapper.find('[data-test="canvas-bg"]').trigger('drop');

    expect(wrapper.emitted('unpack')).toBeFalsy();
  });
});