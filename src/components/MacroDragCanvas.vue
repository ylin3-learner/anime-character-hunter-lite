<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  targetNoun: string;
  modifierBlock: {
    id: string;
    type: string;
    label: string;
  };
}>();

const emit = defineEmits<{
  (e: 'unpack', blockLabel: string): void;
}>();

const isDragging = ref(false);
const isDropped = ref(false);

const handleDragStart = (event: DragEvent) => {
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', props.modifierBlock.label);
  }
};

const handleDragEnd = () => {
  isDragging.value = false;
};

const handleDrop = () => {
  isDropped.value = true;
  // 爆破：通知父組件切換到微觀字磚
  emit('unpack', props.modifierBlock.label);
};
</script>

<template>
  <div 
    data-test="canvas-bg" 
    class="macro-canvas" 
    @drop.prevent="isDropped ? null : $event.preventDefault()"
  >
    <div class="sentence-area">
      <!-- 目標名詞 -->
      <span data-test="target-noun" class="noun">{{ targetNoun }}</span>

      <!-- 拖放目標區（名詞後方） -->
      <div 
        data-test="drop-zone" 
        class="drop-zone"
        :class="{ 'active': isDragging, 'filled': isDropped }"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <span v-if="!isDropped" class="drop-hint">⬇️ 拖曳圖塊到此處 (名詞後方)</span>
        <span v-else class="dropped-content">{{ modifierBlock.label }}</span>
      </div>
    </div>

    <!-- 下方的角色圖塊庫 -->
    <div v-if="!isDropped" class="block-bank">
      <div
        data-test="draggable-block"
        class="character-block"
        draggable="true"
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
      >
        <div class="block-icon">👤</div>
        <div class="block-label">{{ modifierBlock.label }}</div>
      </div>
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
}

.drop-zone.active {
  border-color: #1cb0f6;
  background-color: #e6f7ff;
}

.drop-zone.filled {
  border: 3px solid #ff4d4d;
  background-color: #ffe6e6;
  color: #ff0000;
  font-weight: bold;
}

.drop-hint {
  font-size: 0.9rem;
  color: #999;
}

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
  cursor: grab;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  transition: transform 0.1s;
}

.character-block:active {
  cursor: grabbing;
  transform: scale(0.95);
}

.block-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.block-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}
</style>