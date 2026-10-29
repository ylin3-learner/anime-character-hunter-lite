<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { validatePostModifier } from '../rules/grammarRules';
import type { Antecedent, DiagnosticSignal } from '../rules/types';
import { useSound } from '../utils/useSound';
import { useTTS } from '../utils/useSpeech'; // 👈 引入 TTS

const { playError, playSuccess } = useSound();
const { speak } = useTTS();

const props = defineProps<{
  initialTiles: string[];
  antecedent: Antecedent;
  correctAnswer: string[];
  mode?: 'build' | 'reduce';
  contextCloze?: { prefix: string; suffix: string };
  speechRate?: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'misconception', code: string): void;
}>();

// 初始化字磚狀態
const answerArea = ref<{ id: number; text: string }[]>([]);
const trashArea = ref<{ id: number; text: string }[]>([]); // 👈 新增垃圾桶
const signals = ref<DiagnosticSignal[]>([]);
const isSuccess = ref(false);
const isWrong = ref(false);

// 根據模式初始化
const initTiles = () => {
  if (props.mode === 'reduce') {
    // Reduce 模式：全部字磚（原句）都在作答區，順序是正確的
    answerArea.value = props.initialTiles.map((text, index) => ({ id: index, text }));
    trashArea.value = [];
  } else {
    // Build 模式：初始在作答區的只有空陣列，全部在 wordBank
    // 但在你的舊架構中，是從 wordBank 點進 answerArea，這裡我們保留原有的 wordBank 概念
    // 為了相容，我們這裡把 initialTiles 當作 wordBank 的來源
  }
};

initTiles();

// 用於 Build 模式的 wordBank (如果 props.mode === 'build')
const wordBank = ref<{ id: number; text: string }[]>(
  props.mode === 'build' ? props.initialTiles.map((text, index) => ({ id: index, text })) : []
);

// 點擊作答區的字磚 (Reduce 模式下：丟進垃圾桶)
const discardTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value || props.mode !== 'reduce') return;

  // 從作答區移除
  const index = answerArea.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    const [removed] = answerArea.value.splice(index, 1);
    trashArea.value.push(removed); // 丟進垃圾桶
    isWrong.value = false;
    signals.value = [];
    checkAnswer(); // 每次丟棄後自動檢查
  }
};

// 從垃圾桶撿回字磚
const restoreTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value) return;

  const index = trashArea.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    const [restored] = trashArea.value.splice(index, 1);

    // 根據原本的 id 順序插回正確位置
    answerArea.value.push(restored);
    answerArea.value.sort((a, b) => a.id - b.id);

    isWrong.value = false;
    signals.value = [];
    checkAnswer();
  }
};

// 檢查答案
const checkAnswer = () => {
  const tileTexts = answerArea.value.map(t => t.text);

  // 1. 執行語法檢查
  signals.value = validatePostModifier(tileTexts, props.antecedent, { mode: props.mode });

  if (signals.value.length > 0) {
    playError();
    signals.value.forEach(s => emit('misconception', s.code));
    return;
  }

  // 2. 檢查字序是否正確 (過濾中括號以進行比對)
  const cleanCurrent = tileTexts.map(t => t.replace(/[\[\]]/g, '')).join(' ');
  const cleanTarget = props.correctAnswer.map(t => t.replace(/[\[\]]/g, '')).join(' ');

  if (cleanCurrent === cleanTarget) {
    playSuccess();
    isSuccess.value = true;

    // 朗讀成功句子
    speak(cleanCurrent, { rate: props.speechRate ?? 0.8 });

    setTimeout(() => emit('success'), 1500);
  } else {
    // 如果長度正確但順序不對
    if (answerArea.value.length === props.correctAnswer.length) {
      playError();
      emit('misconception', 'WRONG_ORDER');
      isWrong.value = true;
      setTimeout(() => { isWrong.value = false; }, 500);
    }
  }
};

// Build 模式的點擊邏輯 (保留原有)
const selectTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value) return;
  const index = wordBank.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    wordBank.value.splice(index, 1);
    answerArea.value.push(tile);
    isWrong.value = false;
    signals.value = [];
    if (answerArea.value.length >= props.correctAnswer.length) {
      checkAnswer();
    }
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

const isError = (index: number) => signals.value.some(s => s.index === index);
</script>

<template>
  <div class="micro-tile-game">
    <!-- 克漏字上下文 -->
    <div class="cloze-context" v-if="props.contextCloze">
      <span class="cloze-text">{{ props.contextCloze.prefix }}</span>
      <span class="cloze-blank">
        {{answerArea.length > 0 ? answerArea.map(t => t.text.replace(/[\[\]]/g, '')).join(' ') : '________'}}
      </span>
      <span class="cloze-text">{{ props.contextCloze.suffix }}</span>
    </div>

    <!-- 作答區 -->
    <div data-test="answer-area" class="answer-area" :class="{ 'success-bg': isSuccess, 'shake': isWrong }">
      <div v-for="(tile, index) in answerArea" :key="tile.id" data-test="tile" class="tile" :class="{
        'tile-error': isError(index),
        'tile-success': isSuccess,
        'tile-wrong': isWrong,
        'tile-chunk': tile.text.startsWith('['),
        'is-reduce-mode': props.mode === 'reduce'
      }" @click="props.mode === 'reduce' ? discardTile(tile) : unselectTile(tile)">
        {{ tile.text.replace(/[\[\]]/g, '') }}
      </div>
    </div>

    <!-- 錯誤提示 -->
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

    <!-- 👈 新增：垃圾桶區域 (只在 Reduce 模式顯示) -->
    <div v-if="props.mode === 'reduce'" class="trash-zone-wrapper">
      <div class="trash-label">🗑️ 丟棄不需要的詞</div>
      <div class="trash-area">
        <div v-for="tile in trashArea" :key="tile.id" class="tile trash-tile" @click="restoreTile(tile)">
          {{ tile.text.replace(/[\[\]]/g, '') }}
        </div>
        <div v-if="trashArea.length === 0" class="trash-placeholder">
          點擊上方不要的字磚，把它們丟到這裡！
        </div>
      </div>
    </div>

    <!-- 字磚庫 (只在 Build 模式顯示) -->
    <div v-if="props.mode === 'build'" data-test="word-bank" class="word-bank">
      <div v-for="tile in wordBank" :key="tile.id" data-test="tile" class="tile"
        :class="{ 'tile-chunk': tile.text.startsWith('[') }" @click="selectTile(tile)">
        {{ tile.text.replace(/[\[\]]/g, '') }}
      </div>
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
.word-bank,
.trash-area {
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

.tile-chunk {
  background-color: #e6f7ff;
  border-color: #1cb0f6;
  color: #1899d6;
  border-radius: 20px;
  padding: 12px 24px;
  box-shadow: 0 2px 8px rgba(28, 176, 246, 0.15);
}

.tile-error {
  background-color: #ffdfe0 !important;
  border-color: #ff4b4b !important;
  color: #ea2b2b !important;
}

.tile-success {
  background-color: #d7ffb8 !important;
  border-color: #58cc02 !important;
  color: #58cc02 !important;
}

.tile-wrong {
  background-color: #fff3e0 !important;
  border-color: #ff9800 !important;
  color: #e65100 !important;
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

/* 👈 新增：垃圾桶樣式 */
.trash-zone-wrapper {
  margin-top: 16px;
  border-top: 2px dashed #eee;
  padding-top: 20px;
}

.trash-label {
  font-size: 0.9rem;
  font-weight: bold;
  color: #999;
  margin-bottom: 8px;
  text-align: center;
}

.trash-area {
  background: #fafafa;
  border: 2px dashed #ccc;
  min-height: 80px;
  justify-content: center;
}

.trash-placeholder {
  color: #ccc;
  font-size: 1rem;
  display: flex;
  align-items: center;
}

.trash-tile {
  background: #f0f0f0;
  color: #999;
  border-color: #ddd;
  text-decoration: line-through;
  opacity: 0.7;
  transition: all 0.2s;
}

.trash-tile:hover {
  opacity: 1;
  background: white;
  border-color: #1cb0f6;
  color: #1cb0f6;
  text-decoration: none;
}

/* 讓 reduce 模式點擊字磚有「被剝離」的視覺感 */
.is-reduce-mode:hover {
  background-color: #ffe6e6;
  border-color: #ff4b4b;
  color: #ff4b4b;
  text-decoration: line-through;
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