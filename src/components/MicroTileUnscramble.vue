<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { validatePostModifier } from '../rules/grammarRules';
import type { Antecedent, DiagnosticSignal } from '../rules/types';
import { useSound } from '../utils/useSound';

const { playError } = useSound();

const props = defineProps<{
  initialTiles: string[];
  antecedent: Antecedent;
  correctAnswer: string[];
  mode?: 'build' | 'reduce';
  contextCloze?: { prefix: string; suffix: string }; // 👈 新增
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'misconception', code: string): void;
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
    isWrong.value = false;
    signals.value = [];
  }
};

const unselectTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value) return;
  const index = answerArea.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    answerArea.value.splice(index, 1);
    wordBank.value.push(tile);
    isWrong.value = false;
    signals.value = [];
  }
};

const checkAnswer = () => {
  const tileTexts = answerArea.value.map(t => t.text);
  signals.value = validatePostModifier(tileTexts, props.antecedent, { mode: props.mode });

  if (signals.value.length > 0) {
    playError();
    signals.value.forEach(s => emit('misconception', s.code));
    return;
  }

  const isOrderCorrect = tileTexts.join(' ') === props.correctAnswer.join(' ');

  if (isOrderCorrect) {
    isSuccess.value = true;
    setTimeout(() => emit('success'), 1000);
  } else {
    playError();
    emit('misconception', 'WRONG_ORDER');
    isWrong.value = true;
    setTimeout(() => { isWrong.value = false; }, 500);
  }
};

watch(
  answerArea,
  (newVal) => {
    if (props.mode === 'reduce') return;
    if (newVal.length === props.correctAnswer.length) {
      checkAnswer();
    }
  },
  { deep: true }
);

const isError = (index: number) => signals.value.some(s => s.index === index);
const canCheck = computed(() => answerArea.value.length > 0);
</script>

<template>
  <div class="micro-tile-game">
    <!-- 👇 新增：克漏字上下文顯示 -->
    <div class="cloze-context" v-if="props.contextCloze">
      <span class="cloze-text">{{ props.contextCloze.prefix }}</span>
      <span class="cloze-blank">
        {{answerArea.length > 0 ? answerArea.map(t => t.text).join(' ') : '________'}}
      </span>
      <span class="cloze-text">{{ props.contextCloze.suffix }}</span>
    </div>

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
        <p v-if="signals[0].hint" class="hint-text">💡 {{ signals[0].hint }}</p>
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

    <div v-if="props.mode === 'reduce'" class="check-action">
      <button class="btn-check" :disabled="!canCheck || isSuccess" @click="checkAnswer">
        檢查答案
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 原有樣式保持不變 */
.micro-tile-game {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 300px;
}

.answer-area,
.word-bank {
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

.tile-wrong {
  background-color: #fff3e0;
  border-color: #ff9800;
  color: #e65100;
}

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

.alert-icon {
  font-size: 1.5rem;
}

.alert-messages p {
  margin: 0 0 4px 0;
}

.hint-text {
  color: #666;
  font-size: 0.9rem;
  font-weight: normal;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 75, 75, 0.3);
}

.gentle-alert {
  text-align: center;
  color: #ff9800;
  font-weight: bold;
  animation: fadeIn 0.3s ease-out;
}

.shake {
  animation: shake 0.4s cubic-bezier(.36, .07, .19, .97) both;
}

.check-action {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.btn-check {
  background-color: #1cb0f6;
  color: white;
  border: none;
  border-bottom: 4px solid #1899d6;
  padding: 12px 48px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.1s;
}

.btn-check:active:not(:disabled) {
  border-bottom-width: 0;
  transform: translateY(4px);
}

.btn-check:disabled {
  background-color: #e5e5e5;
  color: #999;
  border-bottom-color: #ccc;
  cursor: not-allowed;
}

/* 👇 新增：克漏字樣式 */
.cloze-context {
  text-align: center;
  font-size: 1.4rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.6;
}

.cloze-text {
  color: #555;
}

.cloze-blank {
  color: #1cb0f6;
  background: #e6f7ff;
  padding: 4px 12px;
  border-radius: 8px;
  border-bottom: 2px dashed #1cb0f6;
  margin: 0 8px;
}

@keyframes shake {

  10%,
  90% {
    transform: translate3d(-2px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(4px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-8px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(8px, 0, 0);
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>