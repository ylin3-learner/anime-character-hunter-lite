<script setup lang="ts">
import { ref, watch } from 'vue';
import { validatePostModifier } from '../rules/grammarRules';
import type { Antecedent, DiagnosticSignal } from '../rules/types';

const props = defineProps<{
  initialTiles: string[];
  antecedent: Antecedent;
  correctAnswer: string[];
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'misconception', code: string): void; // 👈 新增事件
}>();

const wordBank = ref<{ id: number; text: string }[]>(
  props.initialTiles.map((text, index) => ({ id: index, text }))
);
const answerArea = ref<{ id: number; text: string }[]>([]);
const signals = ref<DiagnosticSignal[]>([]);
const isSuccess = ref(false);
const isWrong = ref(false);

const selectTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value) return;
  const index = wordBank.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    wordBank.value.splice(index, 1);
    answerArea.value.push(tile);
  }
};

const unselectTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value) return;
  const index = answerArea.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    answerArea.value.splice(index, 1);
    wordBank.value.push(tile);
    isWrong.value = false;
  }
};

watch(
  answerArea,
  (newVal) => {
    if (newVal.length === props.initialTiles.length) {
      const tileTexts = newVal.map(t => t.text);
      
      signals.value = validatePostModifier(tileTexts, props.antecedent);
      
      // 👇 當有迷思時，向上回報
      if (signals.value.length > 0) {
        signals.value.forEach(s => {
          emit('misconception', s.code);
        });
      }
      
      const isOrderCorrect = tileTexts.join(' ') === props.correctAnswer.join(' ');

      if (signals.value.length === 0 && isOrderCorrect) {
        isSuccess.value = true;
        setTimeout(() => emit('success'), 1000);
      } else if (signals.value.length === 0 && !isOrderCorrect) {
        isWrong.value = true;
        setTimeout(() => { isWrong.value = false; }, 500);
      }
    } else {
      signals.value = [];
      isWrong.value = false;
    }
  },
  { deep: true }
);

const isError = (index: number) => signals.value.some(s => s.index === index);
</script>

<template>
  <!-- Template 與 Style 保持不變，請沿用你原本的程式碼 -->
  <div class="micro-tile-game">
    <div data-test="answer-area" class="answer-area" :class="{ 'success-bg': isSuccess, 'shake': isWrong }">
      <div v-for="(tile, index) in answerArea" :key="tile.id" data-test="tile" class="tile"
        :class="{ 'tile-error': isError(index), 'tile-success': isSuccess, 'tile-wrong': isWrong }"
        @click="unselectTile(tile)">
        {{ tile.text }}
      </div>
    </div>

    <div v-if="signals.length > 0" data-test="alert-bubble" class="alert-bubble">
      <div class="alert-icon">⚠️</div>
      <div class="alert-messages">
        <p v-for="s in signals" :key="s.code">{{ s.message }}</p>
      </div>
    </div>
    
    <div v-else-if="isWrong" class="gentle-alert">
      <p>順序好像不太對喔，點擊字磚退回重排看看！</p>
    </div>

    <div data-test="word-bank" class="word-bank">
      <div v-for="tile in wordBank" :key="tile.id" data-test="tile" class="tile" @click="selectTile(tile)">
        {{ tile.text }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 請保留你原本的樣式 */
.micro-tile-game { display: flex; flex-direction: column; gap: 20px; min-height: 300px; }
.answer-area, .word-bank { display: flex; flex-wrap: wrap; gap: 12px; min-height: 80px; padding: 16px; border-radius: 16px; transition: all 0.3s; }
.answer-area { border-bottom: 4px dashed #e5e5e5; background: #fdfdfd; }
.answer-area.success-bg { border-bottom-color: #58cc02; background: #f0fff0; }
.word-bank { border: 2px solid #e5e5e5; background: #ffffff; }
.tile { padding: 12px 20px; background-color: #ffffff; border: 2px solid #e5e5e5; border-bottom-width: 4px; border-radius: 12px; cursor: pointer; user-select: none; font-size: 1.2rem; font-weight: 600; color: #4b4b4b; transition: all 0.1s; }
.tile:hover { background-color: #f7f7f7; }
.tile:active { border-bottom-width: 2px; transform: translateY(2px); }
.tile-error { background-color: #ffdfe0; border-color: #ff4b4b; color: #ea2b2b; }
.tile-success { background-color: #d7ffb8; border-color: #58cc02; color: #58cc02; }
.tile-wrong { background-color: #fff3e0; border-color: #ff9800; color: #e65100; }
.alert-bubble { display: flex; gap: 12px; background-color: #ffdfe0; color: #ea2b2b; padding: 16px; border-radius: 12px; border: 2px solid #ff4b4b; font-weight: 500; animation: slideDown 0.3s ease-out; }
.alert-icon { font-size: 1.5rem; }
.alert-messages p { margin: 0 0 4px 0; }
.gentle-alert { text-align: center; color: #ff9800; font-weight: bold; animation: fadeIn 0.3s ease-out; }
.shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-8px, 0, 0); } 40%, 60% { transform: translate3d(8px, 0, 0); } }
@keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>