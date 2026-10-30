<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { validatePostModifier } from '../rules/grammarRules';
import type { Antecedent, DiagnosticSignal } from '../rules/types';
import { useSound } from '../utils/useSound';
import { useTTS } from '../utils/useSpeech';

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

const answerArea = ref<{ id: number; text: string }[]>([]);
const trashArea = ref<{ id: number; text: string }[]>([]);
const signals = ref<DiagnosticSignal[]>([]);
const isSuccess = ref(false);
const isWrong = ref(false);

const initTiles = () => {
  console.log('🎮 MicroTileUnscramble 收到的 Props:', {
    mode: props.mode,
    initialTiles: props.initialTiles,
    correctAnswer: props.correctAnswer
  });

  if (props.mode === 'reduce') {
    answerArea.value = props.initialTiles.map((text, index) => ({ id: index, text }));
    trashArea.value = [];
  }
};

initTiles();

// Build 模式：初始字磚庫
const wordBank = ref<{ id: number; text: string }[]>(
  props.mode === 'build' ? props.initialTiles.map((text, index) => ({ id: index, text })) : []
);

const discardTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value || props.mode !== 'reduce') return;
  const index = answerArea.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    const [removed] = answerArea.value.splice(index, 1);
    trashArea.value.push(removed);
    isWrong.value = false;
    signals.value = [];
    checkAnswer();
  }
};

const restoreTile = (tile: { id: number; text: string }) => {
  if (isSuccess.value) return;
  const index = trashArea.value.findIndex(t => t.id === tile.id);
  if (index !== -1) {
    const [restored] = trashArea.value.splice(index, 1);
    answerArea.value.push(restored);
    answerArea.value.sort((a, b) => a.id - b.id); // 保持原本順序
    isWrong.value = false;
    signals.value = [];
    checkAnswer();
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

  const cleanCurrent = tileTexts.map(t => t.replace(/[\[\]]/g, '')).join(' ');
  const cleanTarget = props.correctAnswer.map(t => t.replace(/[\[\]]/g, '')).join(' ');

  if (cleanCurrent === cleanTarget) {
    playSuccess();
    isSuccess.value = true;
    speak(cleanCurrent, { rate: props.speechRate ?? 0.8 });
    setTimeout(() => emit('success'), 1500);
  } else {
    // 長度對了但順序不對 (通常發生在 Build 模式)
    if (answerArea.value.length === props.correctAnswer.length) {
      playError();
      emit('misconception', 'WRONG_ORDER');
      isWrong.value = true;
      setTimeout(() => { isWrong.value = false; }, 500);
    }
  }
};

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

      <div class="cloze-blanks-container">
        <!-- 👈 Build 模式：根據正確答案的長度，固定渲染格子數量 -->
        <template v-if="props.mode === 'build'">
          <span v-for="(_, index) in props.correctAnswer.length" :key="index" class="cloze-blank-slot"
            :class="{ 'has-text': answerArea[index] }">
            {{ answerArea[index] ? answerArea[index].text.replace(/[\[\]]/g, '') : '' }}
          </span>
        </template>

        <!-- 👈 Reduce 模式：動態顯示目前的字磚（讓學生看到完整句子以進行刪減） -->
        <template v-else>
          <span v-for="(tile, index) in answerArea" :key="index" class="cloze-blank-slot has-text">
            {{ tile.text.replace(/[\[\]]/g, '') }}
          </span>
          <span v-if="answerArea.length === 0" class="cloze-blank-slot placeholder"
            style="min-width: 100px; border-bottom: 3px dashed #1cb0f6; height: 38px;"></span>
        </template>
      </div>

      <span class="cloze-text">{{ props.contextCloze.suffix }}</span>
    </div>

    <!-- 作答區 -->
    <div data-test="answer-area" class="answer-area" :class="{ 'success-bg': isSuccess, 'shake': isWrong }">

      <!-- 👈 Build 模式：渲染固定數量的空位 -->
      <template v-if="props.mode === 'build'">
        <div v-for="(slot, index) in props.correctAnswer.length" :key="index" class="answer-slot">
          <div v-if="answerArea[index]" data-test="tile" class="tile" :class="{
            'tile-error': isError(index),
            'tile-success': isSuccess,
            'tile-wrong': isWrong,
            'tile-chunk': answerArea[index].text.startsWith('[')
          }" @click="unselectTile(answerArea[index])">
            {{ answerArea[index].text.replace(/[\[\]]/g, '') }}
          </div>
          <div v-else class="empty-slot"></div>
        </div>
      </template>

      <!-- 👈 Reduce 模式：直接渲染所有字磚，讓學生點擊丟棄 -->
      <template v-else>
        <div v-for="(tile, index) in answerArea" :key="tile.id" data-test="tile" class="tile is-reduce-mode" :class="{
          'tile-error': isError(index),
          'tile-success': isSuccess,
          'tile-wrong': isWrong,
          'tile-chunk': tile.text.startsWith('[')
        }" @click="discardTile(tile)">
          {{ tile.text.replace(/[\[\]]/g, '') }}
        </div>
      </template>

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

    <!-- 垃圾桶區域 (只在 Reduce 模式顯示) -->
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
  align-items: center;
}

.answer-area.success-bg {
  border-bottom-color: #58cc02;
  background: #f0fff0;
}

.word-bank {
  border: 2px solid #e5e5e5;
  background: #ffffff;
}

/* 作答區的空位 (Build 模式用) */
.answer-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  min-height: 50px;
}

.empty-slot {
  width: 100%;
  height: 100%;
  min-width: 60px;
  min-height: 50px;
  border-bottom: 3px dashed #ccc;
  border-radius: 8px;
  background: #f4f4f4;
  transition: all 0.2s;
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
  height: 100%;
  display: flex;
  align-items: center;
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

/* =========================================
   克漏字區域樣式
   ========================================= */
.cloze-context {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.6;
}

.cloze-text {
  color: #555;
}

.cloze-blanks-container {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.cloze-blank-slot {
  min-width: 50px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e6f7ff;
  color: #1cb0f6;
  border-radius: 8px;
  border-bottom: 3px dashed #1cb0f6;
  padding: 0 8px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.cloze-blank-slot.has-text {
  background: #d0f0ff;
  border-bottom-style: solid;
}

/* 垃圾桶樣式 */
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