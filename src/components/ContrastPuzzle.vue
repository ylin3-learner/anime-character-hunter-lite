<script setup lang="ts">
import { ref } from 'vue';
import MicroTileUnscramble from './MicroTileUnscramble.vue';
import type { Antecedent } from '../rules/types';

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
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

// 狀態管理
const isMerged = ref(false);
const showEnglish = ref(false);
const isDragging = ref(false);
const isNearTarget = ref(false);

// 拖拽偏移量 (預設在左側)
const dragX = ref(-80);
const dragY = ref(0);

let startPointerX = 0;
let startPointerY = 0;
let dropZoneRect: DOMRect | null = null;
const dropZoneRef = ref<HTMLElement | null>(null);

// 開始拖拽
const startDrag = (e: PointerEvent) => {
  if (isMerged.value) return;
  
  isDragging.value = true;
  // 防止拖拽時選中文字或圖片
  e.preventDefault();
  
  if (dropZoneRef.value) {
    dropZoneRect = dropZoneRef.value.getBoundingClientRect();
  }

  startPointerX = e.clientX - dragX.value;
  startPointerY = e.clientY - dragY.value;

  window.addEventListener('pointermove', onDrag);
  window.addEventListener('pointerup', stopDrag);
};

// 拖拽中
const onDrag = (e: PointerEvent) => {
  if (!isDragging.value) return;
  
  dragX.value = e.clientX - startPointerX;
  dragY.value = e.clientY - startPointerY;

  // 判斷是否靠近目標區域 (右側名詞圖)
  if (dropZoneRect) {
    const targetX = dropZoneRect.left + dropZoneRect.width / 2;
    const targetY = dropZoneRect.top + dropZoneRect.height / 2;
    
    // 計算當前指針與目標中心的距離
    const distance = Math.hypot(e.clientX - targetX, e.clientY - targetY);
    // 距離小於 120px 就觸發高亮吸附提示
    isNearTarget.value = distance < 120;
  }
};

// 結束拖拽
const stopDrag = () => {
  if (!isDragging.value) return;
  
  isDragging.value = false;
  window.removeEventListener('pointermove', onDrag);
  window.removeEventListener('pointerup', stopDrag);

  if (isNearTarget.value) {
    // 吸附成功！
    isMerged.value = true;
    isNearTarget.value = false;
    
    // 將偏移量固定到剛好貼合的位置 (依據兩張圖的寬度調整)
    dragX.value = -40; 
    dragY.value = 0;

    // 停頓 1.5 秒，讓學生看清楚「中文修飾語在前」的合體結果，再進入英文階段
    setTimeout(() => {
      showEnglish.value = true;
    }, 1500);
  } else {
    // 沒對準，彈回原位
    dragX.value = -80;
    dragY.value = 0;
    isNearTarget.value = false;
  }
};
</script>

<template>
  <div class="contrast-puzzle">
    
    <!-- 第一階段：中文與圖片拼圖 -->
    <div v-if="!showEnglish" class="stage-visual">
      
      <!-- 中文提示 -->
      <div class="chinese-display">
        <h2>
          <span class="highlight">{{ chineseHighlight }}</span>{{ chineseSentence.replace(chineseHighlight, '') }}
        </h2>
      </div>

      <!-- 拼圖互動區 -->
      <div class="puzzle-container">
        
        <!-- 左側：修飾語拼圖 (可拖拽) -->
        <div 
          class="puzzle-piece modifier-piece" 
          :class="{ 'dragging': isDragging }"
          :style="{ 
            transform: `translate(${dragX}px, ${dragY}px)`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            zIndex: isDragging ? 10 : 1
          }"
          @pointerdown="startDrag"
        >
          <img :src="modifierImage" alt="modifier" draggable="false" />
        </div>

        <!-- 右側：名詞拼圖 (目標區域) -->
        <div 
          class="puzzle-piece noun-piece"
          :class="{ 'highlight-target': isNearTarget, 'merged': isMerged }"
          ref="dropZoneRef"
        >
          <img :src="nounImage" alt="noun" draggable="false" />
        </div>

      </div>

      <!-- 提示文字 -->
      <p class="hint" :class="{ 'fade-out': isMerged }">
        <span v-if="!isMerged">👉 請將左邊的圖片拖曳到右邊進行組合</span>
        <span v-else class="success-text">✨ 組合成功！中文的修飾語在名詞<strong>前面</strong>。</span>
      </p>
      
      <!-- 合體後的裝飾線條 -->
      <div v-if="isMerged" class="arrow-line">
        <span class="left-arrow">⬅️ 修飾語</span>
        <span class="noun-text">名詞</span>
      </div>
    </div>

    <!-- 第二階段：英文重組 -->
    <div v-else class="stage-english">
      <div class="english-display">
        <h2 class="english-noun">{{ englishNoun }}</h2>
        <p class="hint">英文：修飾語在<strong>後面</strong> ( 名詞 ➡️ )</p>
      </div>
      
      <MicroTileUnscramble 
        :initialTiles="tiles"
        :antecedent="antecedent"
        :correctAnswer="correctAnswer"
        @success="emit('success')"
      />
    </div>
  </div>
</template>

<style scoped>
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
  margin-bottom: 40px;
  text-align: center;
}

.chinese-display h2 {
  font-size: 2rem;
  color: #333;
  margin: 0;
}

.highlight {
  color: #ea2b2b;
  font-weight: 800;
  background: #ffe6e6;
  padding: 2px 8px;
  border-radius: 8px;
}

/* 拼圖容器 */
.puzzle-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 180px;
  position: relative;
  margin-bottom: 30px;
  user-select: none;
}

/* 拼圖塊基礎樣式 */
.puzzle-piece {
  width: 140px;
  height: 140px;
  overflow: hidden;
  background: #f9f9f9;
  border: 4px solid #1cb0f6;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.puzzle-piece img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

/* 左側修飾語拼圖 */
.modifier-piece {
  cursor: grab;
  touch-action: none; /* 防止手機上拖拽時觸發滾動 */
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none; /* 模擬拼圖接縫 */
  border-color: #ff4b4b;
  background: #fff0f0;
}

.modifier-piece.dragging {
  cursor: grabbing;
  box-shadow: 0 16px 32px rgba(0,0,0,0.15);
}

/* 右側名詞拼圖 */
.noun-piece {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 靠近時的發光提示 */
.noun-piece.highlight-target {
  box-shadow: 0 0 0 8px rgba(28, 176, 246, 0.3);
  border-color: #58cc02;
  transform: scale(1.02);
}

/* 合體成功 */
.noun-piece.merged {
  border-color: #58cc02;
  box-shadow: 0 8px 24px rgba(88, 204, 2, 0.3);
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

.arrow-line {
  display: flex;
  gap: 60px;
  color: #ff4b4b;
  font-weight: bold;
  font-size: 1rem;
  animation: slideUp 0.4s ease;
}

.noun-text {
  color: #1cb0f6;
}

/* 第二階段：英文重組 */
.stage-english {
  width: 100%;
  text-align: center;
  animation: fadeIn 0.5s ease;
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

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>