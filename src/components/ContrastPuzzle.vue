<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import MicroTileUnscramble from './MicroTileUnscramble.vue';
import type { Antecedent } from '../rules/types';
import { useSound } from '../utils/useSound';

const { playSuccess, playError } = useSound();

const props = defineProps<{
  chineseSentence: string;
  chineseHighlight: string;
  nounImage: string;
  modifierImage: string;
  englishNoun: string;
  modifierLabel: string;
  tiles: string[];
  correctAnswer: string[];
  antecedent: Antecedent;
  layout?: 'modifier-left' | 'modifier-right';
  explanationTitle?: string;
  explanationDesc?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'misconception', code: string): void;
}>();

// 👇 座標系設定
const SLOT_WIDTH = 140;
const SLOT_A_X = 160;
const SLOT_B_X = 300;
const LIBRARY_LEFT_X = 50;
const LIBRARY_RIGHT_X = 410;

const isMerged = ref(false);
const isWrong = ref(false); // 👈 新增：錯誤狀態
const showExplanation = ref(false);
const showEnglish = ref(false);
const draggingType = ref<'noun' | 'modifier' | null>(null);

const modifierX = ref(LIBRARY_LEFT_X);
const modifierY = ref(200);
const nounX = ref(LIBRARY_RIGHT_X);
const nounY = ref(200);

const modifierSlot = ref<'A' | 'B' | null>(null);
const nounSlot = ref<'A' | 'B' | null>(null);

const hoverSlot = ref<'A' | 'B' | null>(null);

const isModifierLeft = computed(() => (props.layout || 'modifier-left') === 'modifier-left');

const resetPositions = () => {
  modifierX.value = LIBRARY_LEFT_X;
  modifierY.value = 200;
  nounX.value = LIBRARY_RIGHT_X;
  nounY.value = 200;
  modifierSlot.value = null;
  nounSlot.value = null;
  hoverSlot.value = null;
  isMerged.value = false;
  isWrong.value = false;
};

watch(() => props.layout, resetPositions, { immediate: true });

let startClientX = 0;
let startClientY = 0;
let startLeft = 0;
let startTop = 0;

const startDrag = (e: PointerEvent, type: 'modifier' | 'noun') => {
  // 👇 抖動動畫期間禁止拖拽
  if (isMerged.value || isWrong.value) return;
  draggingType.value = type;
  e.preventDefault();

  startClientX = e.clientX;
  startClientY = e.clientY;
  startLeft = type === 'modifier' ? modifierX.value : nounX.value;
  startTop = type === 'modifier' ? modifierY.value : nounY.value;

  window.addEventListener('pointermove', onDrag);
  window.addEventListener('pointerup', stopDrag);
};

const onDrag = (e: PointerEvent) => {
  if (!draggingType.value) return;
  const deltaX = e.clientX - startClientX;
  const deltaY = e.clientY - startClientY;

  const currentX = startLeft + deltaX;
  const currentY = startTop + deltaY;

  if (draggingType.value === 'modifier') {
    modifierX.value = currentX;
    modifierY.value = currentY;
  } else {
    nounX.value = currentX;
    nounY.value = currentY;
  }

  const targetY = 0;
  if (Math.abs(currentY - targetY) < 100) {
    if (Math.abs(currentX - SLOT_A_X) < 80) {
      hoverSlot.value = 'A';
    } else if (Math.abs(currentX - SLOT_B_X) < 80) {
      hoverSlot.value = 'B';
    } else {
      hoverSlot.value = null;
    }
  } else {
    hoverSlot.value = null;
  }
};

const stopDrag = () => {
  if (!draggingType.value) return;
  window.removeEventListener('pointermove', onDrag);
  window.removeEventListener('pointerup', stopDrag);

  const type = draggingType.value;
  const targetY = 0;
  let isPlaced = false;

  if (hoverSlot.value !== null) {
    const slot = hoverSlot.value;
    const isOccupied = type === 'modifier' ? nounSlot.value === slot : modifierSlot.value === slot;

    if (!isOccupied) {
      if (type === 'modifier') {
        modifierX.value = slot === 'A' ? SLOT_A_X : SLOT_B_X;
        modifierY.value = targetY;
        modifierSlot.value = slot;
      } else {
        nounX.value = slot === 'A' ? SLOT_A_X : SLOT_B_X;
        nounY.value = targetY;
        nounSlot.value = slot;
      }
      isPlaced = true;
    }
  }

  if (!isPlaced) {
    if (type === 'modifier') {
      modifierX.value = LIBRARY_LEFT_X;
      modifierY.value = 200;
      modifierSlot.value = null;
    } else {
      nounX.value = LIBRARY_RIGHT_X;
      nounY.value = 200;
      nounSlot.value = null;
    }
  }

  hoverSlot.value = null;
  draggingType.value = null;

  if (modifierSlot.value && nounSlot.value) {
    checkAnswer();
  }
};

const checkAnswer = () => {
  let isCorrect = false;
  if (isModifierLeft.value) {
    isCorrect = modifierSlot.value === 'A' && nounSlot.value === 'B';
  } else {
    isCorrect = nounSlot.value === 'A' && modifierSlot.value === 'B';
  }

  if (isCorrect) {
    playSuccess();
    isMerged.value = true;
    setTimeout(() => {
      showExplanation.value = true;
    }, 800);
  } else {
    playError();
    emit('misconception', 'PUZZLE_ERROR');

    // 👇 觸發錯誤狀態 (紅框 + 抖動)
    isWrong.value = true;

    // 抖動 800 毫秒後，彈回原位並清除錯誤狀態
    setTimeout(() => {
      isWrong.value = false;
      resetPositions();
    }, 800);
  }
};

const continueToNext = () => {
  showExplanation.value = false;
  showEnglish.value = true;
};
</script>

<template>
  <div class="contrast-puzzle">
    <div v-if="!showEnglish" class="stage-visual">
      <div class="chinese-display">
        <h2>
          <span class="highlight">{{ chineseHighlight }}</span>{{ chineseSentence.replace(chineseHighlight, '') }}
        </h2>
      </div>

      <div class="puzzle-wrapper">
        <!-- 👇 加上 isWrong 綁定，讓整個畫布抖動 -->
        <div class="puzzle-board" :class="{ 'shake': isWrong }">
          <div class="center-line"></div>

          <!-- 👇 上方：兩個空白槽位 (錯誤時紅框) -->
          <div class="slot" :class="{
            'hover': hoverSlot === 'A',
            'filled': modifierSlot === 'A' || nounSlot === 'A',
            'wrong': isWrong // 錯誤時紅框
          }" :style="{ left: `${SLOT_A_X}px` }">
            <span v-if="!modifierSlot && !nounSlot && !hoverSlot && !isWrong" class="slot-text">空格 A</span>
          </div>

          <div class="slot" :class="{
            'hover': hoverSlot === 'B',
            'filled': modifierSlot === 'B' || nounSlot === 'B',
            'wrong': isWrong // 錯誤時紅框
          }" :style="{ left: `${SLOT_B_X}px` }">
            <span v-if="!modifierSlot && !nounSlot && !hoverSlot && !isWrong" class="slot-text">空格 B</span>
          </div>

          <!-- 👇 下方：圖庫 (錯誤時紅框) -->
          <div class="puzzle-piece" :class="{
            'dragging': draggingType === 'modifier',
            'in-slot': modifierSlot !== null,
            'wrong-piece': isWrong // 錯誤時紅框
          }" :style="{
              left: `${modifierX}px`,
              top: `${modifierY}px`,
              transition: draggingType === 'modifier' ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              zIndex: draggingType === 'modifier' ? 10 : 2
            }" @pointerdown="startDrag($event, 'modifier')">
            <img :src="modifierImage" alt="modifier" draggable="false" />
          </div>

          <div class="puzzle-piece" :class="{
            'dragging': draggingType === 'noun',
            'in-slot': nounSlot !== null,
            'wrong-piece': isWrong // 錯誤時紅框
          }" :style="{
              left: `${nounX}px`,
              top: `${nounY}px`,
              transition: draggingType === 'noun' ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              zIndex: draggingType === 'noun' ? 10 : 1
            }" @pointerdown="startDrag($event, 'noun')">
            <img :src="nounImage" alt="noun" draggable="false" />
          </div>
        </div>
      </div>

      <p class="hint" :class="{ 'fade-out': isMerged || isWrong }">
        <span v-if="!isMerged && !isWrong">請將下方的兩張圖，分別拖曳到上方的空格中。</span>
        <span v-if="isWrong" class="error-text">排列順序不對喔，再想想看！</span>
      </p>

      <Transition name="pop-up">
        <div v-if="showExplanation" class="explanation-card">
          <h3>{{ explanationTitle || '✨ 你發現了嗎？' }}</h3>
          <p class="explanation-text">{{ explanationDesc || '在英文中，修飾語的位置是：' }}</p>

          <div class="english-sentence">
            <span class="noun-text">{{ englishNoun }}</span>
            <span class="highlight-red"> {{ modifierLabel }} </span>
          </div>

          <p class="compare-text">對比中文：<span class="highlight-red">{{ chineseHighlight }}</span>{{
            chineseSentence.replace(chineseHighlight, '') }}</p>

          <button class="btn-continue" @click="continueToNext">我懂了，繼續 ➔</button>
        </div>
      </Transition>
    </div>

    <div v-else class="stage-english">
      <div class="english-display">
        <h2 class="english-noun">{{ englishNoun }}</h2>
        <p class="hint">請排列出正確的字序</p>
      </div>
      <MicroTileUnscramble :initialTiles="tiles" :antecedent="antecedent" :correctAnswer="correctAnswer"
        @success="emit('success')" />
    </div>
  </div>
</template>

<style scoped>
/* 原有樣式保持不變，新增錯誤狀態與抖動動畫 */

.contrast-puzzle {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  animation: fadeIn 0.4s ease;
}

.stage-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.chinese-display {
  margin-bottom: 30px;
  text-align: center;
}

.chinese-display h2 {
  font-size: 2rem;
  color: #333;
  margin: 0;
}

.highlight,
.highlight-red {
  color: #ea2b2b;
  font-weight: 800;
  background: #ffe6e6;
  padding: 2px 8px;
  border-radius: 8px;
}

.puzzle-wrapper {
  width: 100%;
  overflow-x: auto;
  display: flex;
  justify-content: center;
  padding: 20px 0;
  margin-bottom: 20px;
}

.puzzle-board {
  position: relative;
  width: 600px;
  height: 400px;
  flex-shrink: 0;
}

.center-line {
  position: absolute;
  left: 300px;
  top: 0;
  bottom: 180px;
  width: 2px;
  background: #e5e5e5;
  transform: translateX(-50%);
  z-index: 0;
}

/* 槽位樣式 */
.slot {
  position: absolute;
  top: 0;
  width: 140px;
  height: 140px;
  border: 4px dashed #ccc;
  border-radius: 16px;
  background: #fafafa;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s;
  z-index: 1;
}

.slot.hover {
  border-color: #1cb0f6;
  background: #e6f7ff;
  transform: scale(1.05);
}

.slot.filled {
  border: none;
  background: transparent;
}

/* 👇 錯誤時的空格紅框 */
.slot.wrong {
  border-color: #ff4b4b !important;
  background: #ffe6e6;
}

.slot-text {
  color: #ccc;
  font-weight: bold;
  font-size: 1.2rem;
}

/* 拼圖塊樣式 */
.puzzle-piece {
  position: absolute;
  width: 140px;
  height: 140px;
  overflow: hidden;
  background: #ffffff;
  border: 4px solid #1cb0f6;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  touch-action: none;
  cursor: grab;
}

.puzzle-piece:active {
  cursor: grabbing;
}

.puzzle-piece.in-slot {
  border-color: #58cc02;
  box-shadow: 0 0 0 4px rgba(88, 204, 2, 0.2);
}

/* 👇 錯誤時的圖片紅框 */
.puzzle-piece.wrong-piece {
  border-color: #ff4b4b !important;
  box-shadow: 0 0 0 4px rgba(255, 75, 75, 0.2);
}

.puzzle-piece img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

/* 👇 抖動動畫 */
.shake {
  animation: shake 0.4s cubic-bezier(.36, .07, .19, .97) both;
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

.hint {
  color: #777;
  font-size: 1.1rem;
  font-weight: bold;
  transition: opacity 0.3s;
  margin-bottom: 20px;
}

.error-text {
  color: #ff4b4b;
}

.english-display {
  margin-bottom: 24px;
}

.english-noun {
  font-size: 2rem;
  color: #1cb0f6;
  font-weight: 800;
  margin: 0 0 8px 0;
}

.explanation-card {
  background: #ffffff;
  border: 3px solid #58cc02;
  border-radius: 20px;
  padding: 24px 32px;
  box-shadow: 0 12px 32px rgba(88, 204, 2, 0.15);
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.explanation-card h3 {
  color: #58cc02;
  font-size: 1.4rem;
  margin-top: 0;
  margin-bottom: 12px;
}

.explanation-text {
  color: #555;
  font-size: 1.1rem;
  margin-bottom: 16px;
}

.english-sentence {
  font-size: 1.5rem;
  font-weight: 800;
  background: #f9f9f9;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 2px dashed #ccc;
}

.noun-text {
  color: #1cb0f6;
}

.compare-text {
  font-size: 0.95rem;
  color: #999;
  margin-bottom: 24px;
}

.btn-continue {
  background: #58cc02;
  color: white;
  border: none;
  border-bottom: 4px solid #46a302;
  padding: 12px 32px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.1s;
  width: 100%;
}

.btn-continue:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

.pop-up-enter-active,
.pop-up-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.pop-up-enter-from,
.pop-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
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