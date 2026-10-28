import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MacroDragCanvas from '../src/components/MacroDragCanvas.vue';

describe('MacroDragCanvas', () => {
  // 更新 Props 以符合泛化後的 grammarFeature 結構
  const props = {
    targetNoun: 'The girl',
    imageUrl: 'dummy-url.svg',
    grammarFeature: {
      relative: { label: 'who wears a blue uniform' },
      preposition: { label: 'in a blue uniform' }
    }
  };

  it('渲染出目標名詞與可點擊的卡片', () => {
    const wrapper = mount(MacroDragCanvas, { props });
    
    expect(wrapper.find('[data-test="target-noun"]').text()).toBe('The girl');
    
    const card = wrapper.find('[data-test="draggable-block"]');
    expect(card.exists()).toBe(true);
    
    // 👈 移除了 draggable="true" 的檢查，因為現在改用點擊互動
    
    // 預設應該是 relative 模式的 label
    expect(card.text()).toContain('who wears a blue uniform');
  });

  it('點擊卡片選取，再點擊放置區，會進入解鎖狀態（觸發 unpack 事件）', async () => {
    const wrapper = mount(MacroDragCanvas, { props });
    
    // 1. 點擊卡片 (模擬選取)
    const card = wrapper.find('[data-test="draggable-block"]');
    await card.trigger('click');
    
    // 驗證卡片進入 selected 狀態 (透過 class 檢查)
    expect(card.classes()).toContain('selected');

    // 2. 點擊放置區 (模擬放置)
    const dropZone = wrapper.find('[data-test="drop-zone"]');
    await dropZone.trigger('click');

    // 3. 驗證 UI 狀態改變 (卡片消失，放置區顯示內容)
    expect(wrapper.find('[data-test="draggable-block"]').exists()).toBe(false);
    expect(dropZone.text()).toContain('who wears a blue uniform');
    
    // 4. 驗證是否觸發了 unpack 事件，且帶入 'relative'
    expect(wrapper.emitted()).toHaveProperty('unpack');
    expect(wrapper.emitted('unpack')![0]).toEqual(['relative']);
  });

  it('未選取卡片時點擊放置區，或點擊背景，不會觸發 unpack', async () => {
    const wrapper = mount(MacroDragCanvas, { props });
    
    // 直接點擊背景
    await wrapper.find('[data-test="canvas-bg"]').trigger('click');
    expect(wrapper.emitted('unpack')).toBeFalsy();

    // 沒選卡片直接點放置區
    await wrapper.find('[data-test="drop-zone"]').trigger('click');
    expect(wrapper.emitted('unpack')).toBeFalsy();
  });
});