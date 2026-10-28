<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  targetNoun: string;
  grammarFeature: {
    relative: { label: string };
    preposition: { label: string };
  };
  imageUrl: string;
}>();

const emit = defineEmits<{
  (e: 'unpack', type: 'relative' | 'preposition'): void;
}>();

const currentMode = ref<'relative' | 'preposition'>('relative');
const isSelected = ref(false); // 取代原本的 isDragging
const isDropped = ref(false);

const toggleMode = () => {
  currentMode.value = currentMode.value === 'relative' ? 'preposition' : 'relative';
  isSelected.value = false; // 切換句型時取消選取
};

// 點擊卡片：切換選取狀態
const handleBlockClick = () => {
  isSelected.value = !isSelected.value;
};

// 點擊放置區：如果卡片已選取，則放入
const handleZoneClick = () => {
  if (isSelected.value && !isDropped.value) {
    isDropped.value = true;
    isSelected.value = false;
    emit('unpack', currentMode.value);
  } else if (isDropped.value) {
    // 可選：如果已經放置了，點擊可以拔出來重選
    // 如果你的業務邏輯不允許反悔，可以刪掉這個 else if
    isDropped.value = false;
    emit('unpack', currentMode.value); // 這裡你可能需要根據實際情況決定要不要重新觸發
  }
};
</script>

<template>
  <div data-test="canvas-bg" class="macro-canvas">
    <div class="sentence-area">
      <span data-test="target-noun" class="noun">{{ targetNoun }}</span>

      <!-- 放置區 -->
      <div data-test="drop-zone" class="drop-zone" :class="{ 'active': isSelected && !isDropped, 'filled': isDropped }"
        @click="handleZoneClick">
        <span v-if="!isDropped" class="drop-hint">
          {{ isSelected ? '👉 點擊放置於此' : '⬇️ 請先選取下方的卡片' }}
        </span>
        <span v-else class="dropped-content">
          {{ grammarFeature[currentMode].label }}
        </span>
      </div>
    </div>

    <!-- 卡片區 -->
    <div v-if="!isDropped" class="block-bank">
      <div data-test="draggable-block" class="character-block" :class="{ 'selected': isSelected }"
        @click="handleBlockClick">
        <img :src="imageUrl" class="block-img" alt="character" />
        <div class="block-label">{{ grammarFeature[currentMode].label }}</div>
      </div>
    </div>

    <!-- 切換句型按鈕 -->
    <div v-if="!isDropped" class="derivation-toggle">
      <p>切換句型：</p>
      <button @click="toggleMode" class="btn-toggle">
        {{ currentMode === 'relative' ? '👉 切換為介系詞片語' : '👉 切換為關係子句' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.macro-canvas {
  padding: 20px;
  background: #fcfcfc;
  border-radius: 12px;
  min-height: 200px;
}

.sentence-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 40px;
  font-size: 1.5rem;
}

.noun {
  font-weight: bold;
  color: #1cb0f6;
}

/* 放置區樣式 */
.drop-zone {
  min-width: 200px;
  min-height: 50px;
  border: 3px dashed #ccc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background-color: #f9f9f9;
  cursor: pointer;
  /* 加上手指游標 */
}

/* 當卡片被選中時，放置區會發光提示 */
.drop-zone.active {
  border-color: #1cb0f6;
  background-color: #e6f7ff;
  box-shadow: 0 0 10px rgba(28, 176, 246, 0.3);
  animation: pulse 1.5s infinite;
}

.drop-zone.filled {
  border: 3px solid #ff4d4d;
  background-color: #ffe6e6;
  color: #ff0000;
  font-weight: bold;
  cursor: default;
}

.drop-hint {
  font-size: 0.9rem;
  color: #999;
}

.drop-zone.active .drop-hint {
  color: #1cb0f6;
  font-weight: bold;
}

/* 卡片樣式 */
.block-bank {
  display: flex;
  gap: 20px;
}

.character-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 20px;
  background: white;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  /* 改為手指游標 */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  user-select: none;
  /* 防止平板上長按選中文字 */
}

/* 卡片被點擊選中時的狀態 */
.character-block.selected {
  border-color: #1cb0f6;
  background-color: #e6f7ff;
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 8px 15px rgba(28, 176, 246, 0.2);
}

.block-img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-bottom: 8px;
  background: #eee;
}

.block-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}

.derivation-toggle {
  margin-top: 30px;
  text-align: center;
}

.btn-toggle {
  background: #e6f7ff;
  color: #1cb0f6;
  border: 2px solid #1cb0f6;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
}

/* 增加一個脈搏動畫，吸引學生點擊放置區 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(28, 176, 246, 0.4);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(28, 176, 246, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(28, 176, 246, 0);
  }
}
</style>