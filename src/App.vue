<script setup lang="ts">
import { ref, computed } from 'vue';
import MacroDragCanvas from './components/MacroDragCanvas.vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import { questionBank } from './data/questions';

const currentIndex = ref(0);
const currentQuestion = computed(() => questionBank[currentIndex.value]);
const currentStage = ref<'macro' | 'micro' | 'success'>('macro');

const handleUnpack = () => {
  currentStage.value = 'micro';
};

const handleSuccess = () => {
  currentStage.value = 'success';
};

const nextQuestion = () => {
  if (currentIndex.value < questionBank.length - 1) {
    currentIndex.value++;
    currentStage.value = 'macro';
  } else {
    currentIndex.value = 0;
    currentStage.value = 'macro';
  }
};
</script>

<template>
  <div class="app-container">
    <header>
      <h1>🕵️ Anime Character Hunter</h1>
      <div class="progress-bar">
        第 {{ currentIndex + 1 }} / {{ questionBank.length }} 關
      </div>
    </header>

    <main class="game-card" :key="currentQuestion.id">
      <!-- 階段：巨觀拖拉 -->
      <div v-if="currentStage === 'macro'" class="stage-content">
        <h2 class="instruction">請將角色圖塊拖曳到名詞<strong>後方</strong>。</h2>
        <div class="target-noun">
          <span class="highlight">{{ currentQuestion.targetNoun }}</span>
        </div>
        <MacroDragCanvas 
          :targetNoun="currentQuestion.targetNoun"
          :modifierBlock="currentQuestion.modifierBlock"
          @unpack="handleUnpack"
        />
      </div>

      <!-- 階段：微觀字磚 -->
      <div v-else-if="currentStage === 'micro'" class="stage-content">
        <h2 class="instruction">圖塊已解鎖！請排列出正確的關係子句。</h2>
        <div class="target-noun">
          <span class="highlight">{{ currentQuestion.targetNoun }}</span>
        </div>
        <MicroTileUnscramble 
          :initialTiles="currentQuestion.tiles" 
          :antecedent="currentQuestion.antecedent" 
          :correctAnswer="currentQuestion.correctAnswer"
          @success="handleSuccess"
        />
      </div>

      <!-- 階段：通關成功 -->
      <div v-else-if="currentStage === 'success'" class="success-screen">
        <div class="confetti">🎉 ✨ 🏆</div>
        <h2>角色解鎖成功！</h2>
        <p class="success-sentence">
          {{ currentQuestion.targetNoun }} 
          <span class="highlight-red">{{ currentQuestion.modifierBlock.label }}</span> 
          is my favorite.
        </p>
        <button class="btn-primary" @click="nextQuestion">
          {{ currentIndex < questionBank.length - 1 ? '下一關 ➔' : '回到第一關 ↺' }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

header h1 {
  color: #1cb0f6;
  font-size: 2rem;
  letter-spacing: -0.5px;
  margin-bottom: 10px;
}

.progress-bar {
  display: inline-block;
  padding: 6px 16px;
  background: #e6f7ff;
  color: #1cb0f6;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
}

.game-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 2px solid #e5e5e5;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.instruction {
  text-align: center;
  color: #777;
  font-size: 1.1rem;
  margin-bottom: 20px;
}

.target-noun {
  text-align: center;
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 30px;
}

.highlight { color: #1cb0f6; }
.highlight-red { color: #ff4b4b; }

/* 通關畫面 */
.success-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.confetti { font-size: 4rem; margin-bottom: 20px; }
.success-screen h2 { color: #58cc02; font-size: 2rem; margin-top: 0; }
.success-sentence {
  font-size: 1.2rem;
  background: #f0fff0;
  padding: 16px 24px;
  border-radius: 12px;
  border: 2px dashed #58cc02;
  margin: 20px 0 40px;
}

.btn-primary {
  background-color: #58cc02;
  color: white;
  border: none;
  border-bottom: 4px solid #46a302;
  padding: 16px 40px;
  font-size: 1.2rem;
  font-weight: bold;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.1s;
}
.btn-primary:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>