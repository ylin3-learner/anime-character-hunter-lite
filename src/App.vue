<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MacroDragCanvas from './components/MacroDragCanvas.vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import TeacherAdmin from './components/TeacherAdmin.vue';
import ContrastPuzzle from './components/ContrastPuzzle.vue';
import StructuredInput from './components/StructuredInput.vue';
import PronunciationAnalyzer from './components/PronunciationAnalyzer.vue';
import { defaultQuestions, type QuestionData } from './data/questions';

const showAdmin = ref(false);
const currentIndex = ref(0);
const questionBank = ref<QuestionData[]>([]);
// 預設先給 macro，避免白屏
const currentStage = ref<'input' | 'macro' | 'micro' | 'success'>('macro');
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
  
  // 👇 防呆：如果第一題沒有 inputData，就直接跳過 input 階段
  checkAndSetInitialStage();
});

const currentQuestion = computed(() => questionBank.value[currentIndex.value] || defaultQuestions[0]);

// 檢查並設定初始階段
const checkAndSetInitialStage = () => {
  if (currentQuestion.value.type === 'contrast') {
    currentStage.value = 'macro'; // 對比題不需要 input 階段
  } else if (currentQuestion.value.inputData) {
    currentStage.value = 'input'; // 有輸入資料才進 input
  } else {
    currentStage.value = 'macro'; // 沒有輸入資料直接進 macro
  }
};

// 取得完整的目標句子與帶停頓符號的顯示句子
const fullSentenceData = computed(() => {
  const noun = currentQuestion.value.targetNoun;
  const modifier = currentQuestion.value.type === 'contrast' 
    ? currentQuestion.value.grammarFeature.relative.label
    : currentQuestion.value.grammarFeature[currentMode.value].label;
    
  return {
    target: `${noun} ${modifier} is my favorite.`,
    display: `${noun} | ${modifier} | is my favorite.`,
    modifier
  };
});

const handleInputSuccess = () => {
  currentStage.value = 'macro';
};

const handleUnpack = (type: 'relative' | 'preposition') => {
  currentMode.value = type;
  currentStage.value = 'micro';
};

const handleSuccess = () => {
  currentStage.value = 'success';
};

const nextQuestion = () => {
  window.speechSynthesis.cancel();
  if (currentIndex.value < questionBank.value.length - 1) {
    currentIndex.value++;
  } else {
    currentIndex.value = 0;
  }
  checkAndSetInitialStage(); // 👈 切換關卡時重新判斷階段
};

const updateQuestionBank = (updatedQuestions: QuestionData[]) => {
  questionBank.value = updatedQuestions;
  localStorage.setItem('custom_questions', JSON.stringify(updatedQuestions));
  currentIndex.value = 0;
  checkAndSetInitialStage(); // 👈 更新題庫時重新判斷階段
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
      
      <!-- 🎯 通關成功畫面 (包含語音分析) -->
      <div v-if="currentStage === 'success'" class="success-screen">
        <div class="confetti">🎉 ✨ 🏆</div>
        <h2>角色解鎖成功！</h2>
        
        <PronunciationAnalyzer 
          :targetSentence="fullSentenceData.target"
          :displaySentence="fullSentenceData.display"
          :highlightPart="fullSentenceData.modifier"
        />

        <button class="btn-primary mt-4" @click="nextQuestion">
          {{ currentIndex < questionBank.length - 1 ? '下一關 ➔' : '回到第一關 ↺' }}
        </button>
      </div>

      <!-- 🎯 類型一：對比題型 (非通關階段) -->
      <div v-else-if="currentQuestion.type === 'contrast' && currentQuestion.contrastData" class="stage-content">
        <ContrastPuzzle 
          :chineseSentence="currentQuestion.contrastData.chineseSentence"
          :chineseHighlight="currentQuestion.contrastData.chineseHighlight"
          :nounImage="currentQuestion.contrastData.nounImage"
          :modifierImage="currentQuestion.contrastData.modifierImage"
          :englishNoun="currentQuestion.targetNoun"
          :modifierLabel="currentQuestion.grammarFeature.relative.label"
          :tiles="currentQuestion.grammarFeature.relative.tiles"
          :correctAnswer="currentQuestion.grammarFeature.relative.correctAnswer"
          :antecedent="currentQuestion.antecedent"
          @success="handleSuccess"
        />
      </div>

      <!-- 🎯 類型二：標準題型 (Input -> Macro -> Micro) -->
      <template v-else>
        <!-- 輸入加工階段 -->
        <div v-if="currentStage === 'input' && currentQuestion.inputData" class="stage-content">
          <StructuredInput 
            :audioText="currentQuestion.inputData.audioText"
            :options="currentQuestion.inputData.options"
            @success="handleInputSuccess"
          />
        </div>

        <!-- 拖拉階段 -->
        <div v-else-if="currentStage === 'macro'" class="stage-content">
          <h2 class="instruction">請將角色圖塊拖曳到名詞<strong>後方</strong>。</h2>
          <div class="target-noun">
            <span class="highlight">{{ currentQuestion.targetNoun }}</span>
          </div>
          <MacroDragCanvas 
            :targetNoun="currentQuestion.targetNoun"
            :grammarFeature="currentQuestion.grammarFeature"
            :imageUrl="currentQuestion.imageUrl"
            @unpack="handleUnpack"
          />
        </div>

        <!-- 字磚階段 -->
        <div v-else-if="currentStage === 'micro'" class="stage-content">
          <h2 class="instruction">圖塊已解鎖！請排列出正確的字序。</h2>
          <div class="target-noun">
            <span class="highlight">{{ currentQuestion.targetNoun }}</span>
          </div>
          <MicroTileUnscramble 
            :initialTiles="currentQuestion.grammarFeature[currentMode].tiles" 
            :antecedent="currentQuestion.antecedent" 
            :correctAnswer="currentQuestion.grammarFeature[currentMode].correctAnswer"
            @success="handleSuccess"
          />
        </div>
      </template>

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
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

header { text-align: center; margin-bottom: 30px; }
header h1 { color: #1cb0f6; font-size: 2.2rem; letter-spacing: -0.5px; margin: 0 0 16px 0; font-weight: 800; }
.header-controls { display: flex; justify-content: center; align-items: center; gap: 16px; }
.progress-bar { padding: 8px 20px; background: #e6f7ff; color: #1cb0f6; border-radius: 20px; font-weight: bold; font-size: 0.95rem; }
.btn-admin { background: #ffc800; color: #fff; border: none; border-bottom: 4px solid #e5b200; padding: 8px 20px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.1s; }
.btn-admin:active { border-bottom-width: 0; transform: translateY(4px); }

.game-card {
  background: white; border-radius: 24px; padding: 40px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08); border: 2px solid #e5e5e5; flex: 1; display: flex; flex-direction: column;
}
.stage-content { display: flex; flex-direction: column; flex: 1; }
.instruction { text-align: center; color: #777; font-size: 1.1rem; margin: 0 0 24px 0; }
.target-noun { text-align: center; font-size: 2rem; font-weight: 800; margin-bottom: 30px; color: #333; }
.highlight { color: #1cb0f6; }

.success-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 20px 0;
}
.confetti { font-size: 5rem; margin-bottom: 16px; animation: bounce 1s infinite alternate; }
@keyframes bounce { 0% { transform: translateY(0); } 100% { transform: translateY(-10px); } }
.success-screen h2 { color: #58cc02; font-size: 2.2rem; margin: 0 0 24px 0; font-weight: 800; }

.btn-primary {
  background-color: #58cc02; color: white; border: none; border-bottom: 5px solid #46a302; padding: 16px 48px; font-size: 1.2rem; font-weight: bold; border-radius: 16px; cursor: pointer; transition: all 0.1s; margin-top: 20px;
}
.btn-primary:active { border-bottom-width: 0; transform: translateY(5px); }

@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>