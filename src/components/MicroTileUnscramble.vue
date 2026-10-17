<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { validatePostModifier } from '../rules/grammarRules';
import type { Antecedent, DiagnosticSignal } from '../rules/types';

const props = defineProps<{
  initialTiles: string[];
  antecedent: Antecedent;
  correctAnswer: string[];
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const wordBank = ref<{ id: number; text: string }[]>(
  props.initialTiles.map((text, index) => ({ id: index, text }))
);
const answerArea = ref<{ id: number; text: string }[]>([]);
const signals = ref<DiagnosticSignal[]>([]);
const isSuccess = ref(false);
const isWrong = ref(false); // 新增：用來觸發答錯的抖動動畫

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
    isWrong.value = false; // 退回字磚時重置錯誤狀態
  }
};

watch(
  answerArea,
  (newVal) => {
    // 當字磚排滿時進行檢查
    if (newVal.length === props.initialTiles.length) {
      const tileTexts = newVal.map(t => t.text);
      
      // 1. 跑迷思檢查
      signals.value = validatePostModifier(tileTexts, props.antecedent);
      
      // 2. 檢查字序是否完全正確
      const isOrderCorrect = 
        tileTexts.join(' ') === props.correctAnswer.join(' ');

      if (signals.value.length === 0 && isOrderCorrect) {
        // 全對！通關
        isSuccess.value = true;
        setTimeout(() => emit('success'), 1000);
      } else if (signals.value.length === 0 && !isOrderCorrect) {
        // 錯排，但沒有踩到迷思雷，觸發抖動反饋
        isWrong.value = true;
        setTimeout(() => {
          isWrong.value = false;
        }, 500); // 抖動 0.5 秒後恢復
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
  <div class="micro-tile-game">
    <!-- 作答區 -->
    <div 
      data-test="answer-area" 
      class="answer-area" 
      :class="{ 
        'success-bg': isSuccess, 
        'shake': isWrong 
      }"
    >
      <div
        v-for="(tile, index) in answerArea"
        :key="tile.id"
        data-test="tile"
        class="tile"
        :class="{ 
          'tile-error': isError(index),
          'tile-success': isSuccess,
          'tile-wrong': isWrong
        }"
        @click="unselectTile(tile)"
      >
        {{ tile.text }}
      </div>
    </div>

    <!-- 警示區 -->
    <div v-if="signals.length > 0" data-test="alert-bubble" class="alert-bubble">
      <div class="alert-icon">⚠️</div>
      <div class="alert-messages">
        <p v-for="s in signals" :key="s.code">{{ s.message }}</p>
      </div>
    </div>
    
    <!-- 答錯溫和提示 -->
    <div v-else-if="isWrong" class="gentle-alert">
      <p>順序好像不太對喔，點擊字磚退回重排看看！</p>
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
  min-height: 300px;
}

.answer-area, .word-bank {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 80px;
  padding: 16px;
  border-radius: 16px;
  transition: all 0.3s;
}

.answer-area {
  border-bottom: 4px dashed #e5e5e5;
  background: #fdfdfd;
}
.answer-area.success-bg {
  border-bottom-color: #58cc02;
  background: #f0fff0;
}

.word-bank {
  border: 2px solid #e5e5e5;
  background: #ffffff;
}

/* Duolingo 風格 3D 按鈕 */
.tile {
  padding: 12px 20px;
  background-color: #ffffff;
  border: 2px solid #e5e5e5;
  border-bottom-width: 4px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  font-size: 1.2rem;
  font-weight: 600;
  color: #4b4b4b;
  transition: all 0.1s;
}

.tile:hover {
  background-color: #f7f7f7;
}

.tile:active {
  border-bottom-width: 2px;
  transform: translateY(2px);
}

/* 錯誤與成功狀態 */
.tile-error {
  background-color: #ffdfe0;
  border-color: #ff4b4b;
  color: #ea2b2b;
}
.tile-success {
  background-color: #d7ffb8;
  border-color: #58cc02;
  color: #58cc02;
}

/* 答錯（沒踩文法雷）的狀態 */
.tile-wrong {
  background-color: #fff3e0;
  border-color: #ff9800;
  color: #e65100;
}

/* 警示氣泡 */
.alert-bubble {
  display: flex;
  gap: 12px;
  background-color: #ffdfe0;
  color: #ea2b2b;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid #ff4b4b;
  font-weight: 500;
  animation: slideDown 0.3s ease-out;
}
.alert-icon { font-size: 1.5rem; }
.alert-messages p { margin: 0 0 4px 0; }

/* 溫和提示 */
.gentle-alert {
  text-align: center;
  color: #ff9800;
  font-weight: bold;
  animation: fadeIn 0.3s ease-out;
}

/* 抖動動畫 */
.shake {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-2px, 0, 0); }
  20%, 80% { transform: translate3d(4px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
  40%, 60% { transform: translate3d(8px, 0, 0); }
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>