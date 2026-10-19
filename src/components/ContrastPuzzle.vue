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
  // 👇 新增：接收自訂解釋卡內容
  explanationTitle?: string;
  explanationDesc?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'misconception', code: string): void;
}>();

// 座標系設定
const BOARD_WIDTH = 600;
const PIECE_SIZE = 140;
const CENTER_X = 300;

const LEFT_TARGET = CENTER_X - PIECE_SIZE;
const RIGHT_TARGET = CENTER_X;
const FAR_LEFT = 0;
const FAR_RIGHT = BOARD_WIDTH - PIECE_SIZE;

const isMerged = ref(false);
const showExplanation = ref(false);
const showEnglish = ref(false);
const draggingType = ref<'noun' | 'modifier' | null>(null);
const isNearTarget = ref(false);

const isModifierLeft = computed(() => (props.layout || 'modifier-left') === 'modifier-left');

const nounX = computed(() => isModifierLeft.value ? RIGHT_TARGET : LEFT_TARGET);
const targetModifierX = computed(() => isModifierLeft.value ? LEFT_TARGET : RIGHT_TARGET);
const initialModifierX = computed(() => isModifierLeft.value ? FAR_RIGHT : FAR_LEFT);

const modifierX = ref(initialModifierX.value);
const modifierY = ref(0);

watch(() => props.layout, () => {
  modifierX.value = initialModifierX.value;
  modifierY.value = 0;
}, { immediate: true });

let startClientX = 0;
let startClientY = 0;
let startLeft = 0;
let startTop = 0;

const startDrag = (e: PointerEvent) => {
  if (isMerged.value) return;
  draggingType.value = 'modifier';
  e.preventDefault();

  startClientX = e.clientX;
  startClientY = e.clientY;
  startLeft = modifierX.value;
  startTop = modifierY.value;

  window.addEventListener('pointermove', onDrag);
  window.addEventListener('pointerup', stopDrag);
};

const onDrag = (e: PointerEvent) => {
  if (draggingType.value !== 'modifier') return;
  const deltaX = e.clientX - startClientX;
  const deltaY = e.clientY - startClientY;

  modifierX.value = startLeft + deltaX;
  modifierY.value = startTop + deltaY;

  const distance = Math.hypot(modifierX.value - targetModifierX.value, modifierY.value);
  isNearTarget.value = distance < 60;
};

const stopDrag = () => {
  if (draggingType.value !== 'modifier') return;
  window.removeEventListener('pointermove', onDrag);
  window.removeEventListener('pointerup', stopDrag);

  const mCenter = modifierX.value + PIECE_SIZE / 2;
  let hasCrossedCenter = false;
  if (isModifierLeft.value) {
    hasCrossedCenter = mCenter < CENTER_X;
  } else {
    hasCrossedCenter = mCenter > CENTER_X + (PIECE_SIZE / 2);
  }

  const distanceToTarget = Math.hypot(modifierX.value - targetModifierX.value, modifierY.value);

  if (hasCrossedCenter && distanceToTarget < 60) {
    playSuccess();
    isMerged.value = true;

    modifierX.value = targetModifierX.value;
    modifierY.value = 0;

    setTimeout(() => {
      showExplanation.value = true;
    }, 800);
  } else {
    playError();
    emit('misconception', 'PUZZLE_ERROR'); // 發送拼圖錯誤代碼
    modifierX.value = initialModifierX.value;
    modifierY.value = 0;
    isNearTarget.value = false;
  }

  draggingType.value = null;
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
        <div class="puzzle-board">
          <div class="center-line"></div>

          <div class="puzzle-piece noun-piece" :style="{ left: `${nounX}px` }">
            <img :src="nounImage" alt="noun" draggable="false" />
          </div>

          <div class="target-slot" :class="{ 'highlight': isNearTarget }" :style="{
            left: `${targetModifierX}px`,
            borderColor: isNearTarget ? '#58cc02' : '#ccc',
            backgroundColor: isNearTarget ? '#f0fff0' : 'transparent',
            opacity: isMerged ? 0 : 1
          }">
            <span v-if="!draggingType && !isMerged" class="slot-hint">放這裡</span>
          </div>

          <div class="puzzle-piece modifier-piece"
            :class="{ 'dragging': draggingType === 'modifier', 'merged': isMerged }" :style="{
              left: `${modifierX}px`,
              top: `${modifierY}px`,
              transition: draggingType === 'modifier' ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              zIndex: draggingType === 'modifier' ? 10 : 2
            }" @pointerdown="startDrag">
            <img :src="modifierImage" alt="modifier" draggable="false" />
          </div>
        </div>
      </div>

      <p class="hint" :class="{ 'fade-out': isMerged }">
        <span v-if="!isMerged">請將圖片拖曳到虛線框內</span>
      </p>

      <Transition name="pop-up">
        <div v-if="showExplanation" class="explanation-card">
          <!-- 👇 這裡改成吃 Props 的動態內容 -->
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
/* 樣式保持不變 */
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
  height: 140px;
  flex-shrink: 0;
}

.center-line {
  position: absolute;
  left: 300px;
  top: -20px;
  bottom: -20px;
  width: 2px;
  background: #e5e5e5;
  transform: translateX(-50%);
  z-index: 0;
}

.puzzle-piece {
  position: absolute;
  width: 140px;
  height: 140px;
  overflow: hidden;
  background: #ffffff;
  border: 4px solid #1cb0f6;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  top: 0;
  touch-action: none;
}

.puzzle-piece img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.noun-piece {
  z-index: 1;
}

.modifier-piece {
  cursor: grab;
  border-color: #ff4b4b;
  background: #fff0f0;
}

.modifier-piece:active {
  cursor: grabbing;
}

.modifier-piece.merged {
  border-color: #58cc02;
  background: #ffffff;
  cursor: default;
}

.target-slot {
  position: absolute;
  width: 140px;
  height: 140px;
  border: 4px dashed #ccc;
  border-radius: 16px;
  top: 0;
  z-index: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
}

.target-slot.highlight {
  border-style: solid;
  box-shadow: 0 0 0 8px rgba(88, 204, 2, 0.2);
}

.slot-hint {
  color: #ccc;
  font-weight: bold;
  font-size: 1.2rem;
}

.hint {
  color: #777;
  font-size: 1.1rem;
  font-weight: bold;
  transition: opacity 0.3s;
  margin-bottom: 20px;
}

.success-text {
  color: #58cc02;
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