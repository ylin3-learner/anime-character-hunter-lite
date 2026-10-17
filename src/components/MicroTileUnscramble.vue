<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { validatePostModifier } from '../rules/grammarRules';
import type { Antecedent, DiagnosticSignal } from '../rules/types';

const props = defineProps<{
  initialTiles: string[];
  antecedent: Antecedent;
}>();

// 存放尚未選擇的字磚，先打散（這裡為了測試穩定，先保留原順序，實際可加 shuffle）
const wordBank = ref<{ id: number; text: string }[]>(
  props.initialTiles.map((text, index) => ({ id: index, text }))
);

// 存放已選擇的作答字磚
const answerArea = ref<{ id: number; text: string }[]>([]);

// 當前驗證訊號
const signals = ref<DiagnosticSignal[]>([]);

// 點擊字磚
const selectTile = (tile: { id: number; text: string }) => {
  const index = wordBank.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    wordBank.value.splice(index, 1);
    answerArea.value.push(tile);
  }
};

// 退回字磚
const unselectTile = (tile: { id: number; text: string }) => {
  const index = answerArea.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    answerArea.value.splice(index, 1);
    wordBank.value.push(tile);
  }
};

// 當作答區改變時，觸發驗證
watch(
  answerArea,
  (newVal) => {
    if (newVal.length === props.initialTiles.length) {
      const tileTexts = newVal.map(t => t.text);
      signals.value = validatePostModifier(tileTexts, props.antecedent);
    } else {
      signals.value = []; // 還沒排完，清空錯誤
    }
  },
  { deep: true }
);

// 判斷某個 index 是否出錯
const isError = (index: number) => {
  return signals.value.some(s => s.index === index);
};
</script>

<template>
  <div class="micro-tile-game">
    <!-- 作答區 -->
    <div data-test="answer-area" class="answer-area">
      <div
        v-for="(tile, index) in answerArea"
        :key="tile.id"
        data-test="tile"
        class="tile"
        :class="{ 'tile-error': isError(index) }"
        @click="unselectTile(tile)"
      >
        {{ tile.text }}
      </div>
    </div>

    <!-- 警示區 -->
    <div v-if="signals.length > 0" data-test="alert-bubble" class="alert-bubble">
      <p v-for="s in signals" :key="s.code">{{ s.message }}</p>
    </div>

    <!-- 字磚庫 -->
    <div data-test="word-bank" class="word-bank">
      <div
        v-for="tile in wordBank"
        :key="tile.id"
        data-test="tile"
        class="tile"
        @click="selectTile(tile)"
      >
        {{ tile.text }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.micro-tile-game {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  font-family: sans-serif;
}

.answer-area, .word-bank {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 60px;
  padding: 10px;
  border: 2px dashed #ccc;
  border-radius: 8px;
}

.tile {
  padding: 10px 20px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.tile:active {
  transform: scale(0.95);
}

.tile-error {
  background-color: #ffe6e6;
  border-color: #ff4d4d;
  color: #ff0000;
  font-weight: bold;
}

.alert-bubble {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px 15px;
  border-radius: 8px;
  border-left: 4px solid #f44336;
}
</style>