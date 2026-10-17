<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  targetNoun: string;
  modifiers: {
    relative: { label: string };
    preposition: { label: string };
  };
  imageUrl: string;
}>();

const emit = defineEmits<{
  (e: 'unpack', type: 'relative' | 'preposition'): void;
}>();

const currentMode = ref<'relative' | 'preposition'>('relative');
const isDragging = ref(false);
const isDropped = ref(false);

const toggleMode = () => {
  currentMode.value = currentMode.value === 'relative' ? 'preposition' : 'relative';
};

const handleDragStart = (event: DragEvent) => {
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', props.modifiers[currentMode.value].label);
  }
};

const handleDragEnd = () => { isDragging.value = false; };

const handleDrop = () => {
  isDropped.value = true;
  emit('unpack', currentMode.value);
};
</script>

<template>
  <!-- 補回 data-test="canvas-bg" -->
  <div data-test="canvas-bg" class="macro-canvas" @drop.prevent>
    <div class="sentence-area">
      <!-- 補回 data-test="target-noun" -->
      <span data-test="target-noun" class="noun">{{ targetNoun }}</span>
      <!-- 補回 data-test="drop-zone" -->
      <div 
        data-test="drop-zone"
        class="drop-zone"
        :class="{ 'active': isDragging, 'filled': isDropped }"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <span v-if="!isDropped" class="drop-hint">⬇️ 拖曳至此 (名詞後方)</span>
        <span v-else class="dropped-content">{{ modifiers[currentMode].label }}</span>
      </div>
    </div>

    <div v-if="!isDropped" class="block-bank">
      <!-- 補回 data-test="draggable-block" -->
      <div 
        data-test="draggable-block"
        class="character-block" 
        draggable="true" 
        @dragstart="handleDragStart" 
        @dragend="handleDragEnd"
      >
        <img :src="imageUrl" class="block-img" alt="character" />
        <div class="block-label">{{ modifiers[currentMode].label }}</div>
      </div>
    </div>

    <!-- 切換器 (Module C) -->
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
</style>