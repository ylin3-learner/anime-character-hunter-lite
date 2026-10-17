<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MacroDragCanvas from './components/MacroDragCanvas.vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import TeacherAdmin from './components/TeacherAdmin.vue';
import { defaultQuestions, type QuestionData } from './data/questions';

const showAdmin = ref(false);
const currentIndex = ref(0);
const questionBank = ref<QuestionData[]>([]);
const currentStage = ref<'macro' | 'micro' | 'success'>('macro');
const currentMode = ref<'relative' | 'preposition'>('relative');

onMounted(() => {
  const saved = localStorage.getItem('custom_questions');
  if (saved) {
    try {
      questionBank.value = JSON.parse(saved);
    } catch (e) {
      questionBank.value = [...defaultQuestions];
    }
  } else {
    questionBank.value = [...defaultQuestions];
  }
});

const currentQuestion = computed(() => questionBank.value[currentIndex.value] || defaultQuestions[0]);

const handleUnpack = (type: 'relative' | 'preposition') => {
  currentMode.value = type;
  currentStage.value = 'micro';
};

const handleSuccess = () => { currentStage.value = 'success'; };

const nextQuestion = () => {
  if (currentIndex.value < questionBank.value.length - 1) {
    currentIndex.value++;
    currentStage.value = 'macro';
  } else {
    currentIndex.value = 0;
    currentStage.value = 'macro';
  }
};

const updateQuestionBank = (updatedQuestions: QuestionData[]) => {
  questionBank.value = updatedQuestions;
  localStorage.setItem('custom_questions', JSON.stringify(updatedQuestions));
  currentIndex.value = 0;
  currentStage.value = 'macro';
};
</script>

<template>
  <div class="app-container">
    <header>
      <h1>🕵️ Anime Character Hunter</h1>
      <div class="header-controls">
        <div class="progress-bar">
          第 {{ currentIndex + 1 }} / {{ questionBank.length }} 關
        </div>
        <button class="btn-admin" @click="showAdmin = true">👩‍🏫 教師備課中心</button>
      </div>
    </header>

    <main class="game-card" :key="currentQuestion.id + currentMode">
      <!-- 階段：巨觀拖拉 -->
      <div v-if="currentStage === 'macro'" class="stage-content">
        <h2 class="instruction">請將角色圖塊拖曳到名詞<strong>後方</strong>。</h2>
        <div class="target-noun">
          <span class="highlight">{{ currentQuestion.targetNoun }}</span>
        </div>
        <MacroDragCanvas 
          :targetNoun="currentQuestion.targetNoun"
          :modifiers="currentQuestion.modifiers"
          :imageUrl="currentQuestion.imageUrl"
          @unpack="handleUnpack"
        />
      </div>

      <!-- 階段：微觀字磚 -->
      <div v-else-if="currentStage === 'micro'" class="stage-content">
        <h2 class="instruction">圖塊已解鎖！請排列出正確的字序。</h2>
        <div class="target-noun">
          <span class="highlight">{{ currentQuestion.targetNoun }}</span>
        </div>
        <MicroTileUnscramble 
          :initialTiles="currentQuestion.modifiers[currentMode].tiles" 
          :antecedent="currentQuestion.antecedent" 
          :correctAnswer="currentQuestion.modifiers[currentMode].correctAnswer"
          @success="handleSuccess"
        />
      </div>

      <!-- 階段：通關成功 -->
      <div v-else-if="currentStage === 'success'" class="success-screen">
        <div class="confetti">🎉 ✨ 🏆</div>
        <h2>角色解鎖成功！</h2>
        <div class="success-sentence">
          {{ currentQuestion.targetNoun }} 
          <span class="highlight-red">{{ currentQuestion.modifiers[currentMode].label }}</span> 
          is my favorite.
        </div>
        <button class="btn-primary" @click="nextQuestion">
          {{ currentIndex < questionBank.length - 1 ? '下一關 ➔' : '回到第一關 ↺' }}
        </button>
      </div>
    </main>

    <TeacherAdmin 
      v-if="showAdmin" 
      :currentQuestions="questionBank"
      @update="updateQuestionBank" 
      @close="showAdmin = false" 
    />
  </div>
</template>

<style scoped>
/* 確保整個 App 容器置中並有背景色 */
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Header 置中 */
header {
  text-align: center;
  margin-bottom: 30px;
}

header h1 {
  color: #1cb0f6;
  font-size: 2.2rem;
  letter-spacing: -0.5px;
  margin-top: 0;
  margin-bottom: 16px;
  font-weight: 800;
}

.header-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.progress-bar {
  padding: 8px 20px;
  background: #e6f7ff;
  color: #1cb0f6;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.95rem;
}

.btn-admin {
  background: #ffc800; 
  color: #fff; 
  border: none; 
  border-bottom: 4px solid #e5b200;
  padding: 8px 20px;
  border-radius: 12px; 
  font-weight: bold; 
  cursor: pointer;
  transition: all 0.1s;
}
.btn-admin:active { border-bottom-width: 0; transform: translateY(4px); }

/* 遊戲主卡片 */
.game-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border: 2px solid #e5e5e5;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stage-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.instruction {
  text-align: center;
  color: #777;
  font-size: 1.1rem;
  margin-top: 0;
  margin-bottom: 24px;
}

.target-noun {
  text-align: center;
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 30px;
  color: #333;
}

.highlight { color: #1cb0f6; }
.highlight-red { color: #ff4b4b; font-weight: 800; }

/* 通關成功畫面 */
.success-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  padding: 40px 0;
}

.confetti { 
  font-size: 5rem; 
  margin-bottom: 16px; 
  animation: bounce 1s infinite alternate;
}

@keyframes bounce {
  0% { transform: translateY(0); }
  100% { transform: translateY(-10px); }
}

.success-screen h2 { 
  color: #58cc02; 
  font-size: 2.2rem; 
  margin: 0 0 24px 0;
  font-weight: 800;
}

.success-sentence {
  font-size: 1.4rem;
  background: #f0fff0;
  padding: 24px 32px;
  border-radius: 16px;
  border: 2px dashed #58cc02;
  margin-bottom: 40px;
  line-height: 1.6;
  color: #333;
  max-width: 90%;
}

.btn-primary {
  background-color: #58cc02;
  color: white;
  border: none;
  border-bottom: 5px solid #46a302;
  padding: 16px 48px;
  font-size: 1.2rem;
  font-weight: bold;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.1s;
}
.btn-primary:active {
  border-bottom-width: 0;
  transform: translateY(5px);
}

@keyframes popIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>