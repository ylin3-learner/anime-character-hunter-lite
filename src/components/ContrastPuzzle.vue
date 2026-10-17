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

const isMerged = ref(false);

const handleMerge = () => {
  isMerged.value = true;
};
</script>

<template>
  <div class="contrast-puzzle">
    <!-- 第一階段：中文與圖片拼圖 -->
    <div v-if="!isMerged" class="stage-visual">
      <div class="chinese-display">
        <h2 data-test="chinese-sentence">
          <span data-test="highlight" class="highlight">{{ chineseHighlight }}</span>{{ chineseSentence.replace(chineseHighlight, '') }}
        </h2>
        <p class="hint">中文：修飾語在<strong>前面</strong> ( ⬅️ 名詞 )</p>
      </div>

      <div class="puzzle-container">
        <div class="puzzle-piece modifier-piece" data-test="puzzle-piece">
          <img :src="modifierImage" alt="modifier" />
        </div>
        <div class="puzzle-plus">+</div>
        <div class="puzzle-piece noun-piece" data-test="puzzle-piece">
          <img :src="nounImage" alt="noun" />
        </div>
      </div>

      <button class="btn-merge" data-test="merge-btn" @click="handleMerge">
        拼在一起，看看英文怎麼說 ➔
      </button>
    </div>

    <!-- 第二階段：英文重組 -->
    <div v-else class="stage-english">
      <div class="english-display">
        <h2 data-test="english-noun" class="english-noun">{{ englishNoun }}</h2>
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
}

.chinese-display, .english-display {
  text-align: center;
  margin-bottom: 30px;
}

.chinese-display h2 {
  font-size: 2rem;
  color: #333;
  margin: 0 0 10px 0;
}

.highlight {
  color: #ff4b4b;
  font-weight: bold;
  background: #ffe6e6;
  padding: 0 8px;
  border-radius: 8px;
}

.hint {
  color: #777;
  font-size: 1rem;
}

.puzzle-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
}

.puzzle-piece {
  width: 120px;
  height: 120px;
  border: 3px dashed #1cb0f6;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f7f9fc;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.puzzle-piece img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.modifier-piece {
  border-color: #ff4b4b;
  background: #fff0f0;
  /* 模擬拼圖凸起 */
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}

.noun-piece {
  /* 模擬拼圖凹槽 */
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.puzzle-plus {
  font-size: 2rem;
  color: #999;
  font-weight: bold;
}

.btn-merge {
  background: #1cb0f6;
  color: white;
  border: none;
  border-bottom: 4px solid #1899d6;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.1s;
}

.btn-merge:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

.english-noun {
  font-size: 2rem;
  color: #1cb0f6;
  margin: 0 0 10px 0;
  font-weight: 800;
}
</style>