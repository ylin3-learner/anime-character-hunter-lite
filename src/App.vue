<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MacroDragCanvas from './components/MacroDragCanvas.vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import TeacherAdmin from './components/TeacherAdmin.vue';
import ContrastPuzzle from './components/ContrastPuzzle.vue';
import StructuredInput from './components/StructuredInput.vue';
import PronunciationAnalyzer from './components/PronunciationAnalyzer.vue';
import NoticingBoard from './components/NoticingBoard.vue';
import { defaultQuestions, type QuestionData } from './data/questions';

const showAdmin = ref(false);
const currentIndex = ref(0);
const questionBank = ref<QuestionData[]>([]);
const currentStage = ref<'input' | 'macro' | 'micro' | 'success' | 'noticing'>('macro');
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
  checkAndSetInitialStage();
});

const currentQuestion = computed(() => questionBank.value[currentIndex.value] || defaultQuestions[0]);

// 👇 取得目前題目啟用的階段
const getEnabledStages = computed(() => {
  return currentQuestion.value.enabledStages || ['input', 'macro', 'micro', 'pronunciation', 'noticing'];
});

// 👇 根據開關決定初始階段
const checkAndSetInitialStage = () => {
  if (currentQuestion.value.type === 'contrast') {
    currentStage.value = 'macro';
    return;
  }
  
  if (getEnabledStages.value.includes('input') && currentQuestion.value.inputData) {
    currentStage.value = 'input';
  } else if (getEnabledStages.value.includes('macro')) {
    currentStage.value = 'macro';
  } else if (getEnabledStages.value.includes('micro')) {
    currentStage.value = 'micro';
  } else {
    currentStage.value = 'success'; // 如果老師把前面都關了，直接跳 success
  }
};

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
  if (getEnabledStages.value.includes('macro')) {
    currentStage.value = 'macro';
  } else if (getEnabledStages.value.includes('micro')) {
    currentStage.value = 'micro';
  } else {
    currentStage.value = 'success';
  }
};

const handleUnpack = (type: 'relative' | 'preposition') => {
  currentMode.value = type;
  currentStage.value = 'micro';
};

const handleSuccess = () => {
  currentStage.value = 'success';
};

// 👇 處理下一關邏輯：結合模組開關與 Noticing 判斷
const nextQuestion = () => {
  window.speechSynthesis.cancel();

  // 如果剛從 success 出來，且有開啟 noticing，就跳到 noticing
  if (currentStage.value === 'success' && getEnabledStages.value.includes('noticing') && currentQuestion.value.noticingData) {
    currentStage.value = 'noticing';
    return;
  }

  // 真正的下一題
  if (currentIndex.value < questionBank.value.length - 1) {
    currentIndex.value++;
  } else {
    currentIndex.value = 0;
  }
  checkAndSetInitialStage();
};

const handleNoticingComplete = () => {
  if (currentIndex.value < questionBank.value.length - 1) {
    currentIndex.value++;
  } else {
    currentIndex.value = 0;
  }
  checkAndSetInitialStage();
};

const updateQuestionBank = (updatedQuestions: QuestionData[]) => {
  try {
    localStorage.setItem('custom_questions', JSON.stringify(updatedQuestions));
    questionBank.value = updatedQuestions;
    currentIndex.value = 0;
    checkAndSetInitialStage();
    showAdmin.value = false;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      alert('儲存空間已滿！因為圖片佔用太多空間，請試著減少圖片數量，或使用較小的圖片。\n\n(目前為 MVP 測試階段，正式版會將圖片存在雲端)');
    } else {
      console.error('儲存題庫失敗:', error);
      alert('儲存題庫失敗，請重試。');
    }
  }
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

      <!-- 🎯 意識提升歸納板 -->
      <div v-if="currentStage === 'noticing' && currentQuestion.noticingData" class="stage-content"
        style="justify-content: center;">
        <NoticingBoard :data="currentQuestion.noticingData" @complete="handleNoticingComplete" />
      </div>

      <!-- 🎯 通關成功畫面 -->
      <div v-else-if="currentStage === 'success'" class="success-screen">
        <div class="confetti">🎉 ✨ 🏆</div>
        <h2>角色解鎖成功！</h2>

        <!-- 👇 只有當老師啟用語音階段時，才顯示 PronunciationAnalyzer -->
        <PronunciationAnalyzer 
          v-if="getEnabledStages.includes('pronunciation')"
          :targetSentence="fullSentenceData.target" 
          :displaySentence="fullSentenceData.display"
          :highlightPart="fullSentenceData.modifier" 
          @skip="nextQuestion"
        />
        <p v-else class="skip-hint">已略過語音練習。</p>

        <button class="btn-primary mt-4" @click="nextQuestion">
          {{ currentIndex < questionBank.length - 1 ? '下一關 ➔' : '回到第一關 ↺' }} 
        </button>
      </div>

      <!-- 🎯 類型一：對比題型 -->
      <div v-else-if="currentQuestion.type === 'contrast' && currentQuestion.contrastData" class="stage-content">
        <ContrastPuzzle :chineseSentence="currentQuestion.contrastData.chineseSentence"
          :chineseHighlight="currentQuestion.contrastData.chineseHighlight"
          :nounImage="currentQuestion.contrastData.nounImage"
          :modifierImage="currentQuestion.contrastData.modifierImage" :englishNoun="currentQuestion.targetNoun"
          :modifierLabel="currentQuestion.grammarFeature.relative.label"
          :tiles="currentQuestion.grammarFeature.relative.tiles"
          :correctAnswer="currentQuestion.grammarFeature.relative.correctAnswer"
          :antecedent="currentQuestion.antecedent" @success="handleSuccess" />
      </div>

      <!-- 🎯 類型二：標準題型 -->
      <template v-else>
        <!-- 輸入加工階段 -->
        <div v-if="currentStage === 'input' && currentQuestion.inputData" class="stage-content">
          <StructuredInput :audioText="currentQuestion.inputData.audioText" :options="currentQuestion.inputData.options"
            @success="handleInputSuccess" />
        </div>

        <!-- 拖拉階段 -->
        <div v-else-if="currentStage === 'macro'" class="stage-content">
          <h2 class="instruction">請將角色圖塊拖曳到名詞<strong>後方</strong>。</h2>
          <div class="target-noun">
            <span class="highlight">{{ currentQuestion.targetNoun }}</span>
          </div>
          <MacroDragCanvas :targetNoun="currentQuestion.targetNoun" :grammarFeature="currentQuestion.grammarFeature"
            :imageUrl="currentQuestion.imageUrl" @unpack="handleUnpack" />
        </div>

        <!-- 字磚階段 -->
        <div v-else-if="currentStage === 'micro'" class="stage-content">
          <h2 class="instruction">圖塊已解鎖！請排列出正確的字序。</h2>
          <div class="target-noun">
            <span class="highlight">{{ currentQuestion.targetNoun }}</span>
          </div>
          <MicroTileUnscramble :initialTiles="currentQuestion.grammarFeature[currentMode].tiles"
            :antecedent="currentQuestion.antecedent"
            :correctAnswer="currentQuestion.grammarFeature[currentMode].correctAnswer" @success="handleSuccess" />
        </div>
      </template>

    </main>

    <TeacherAdmin v-if="showAdmin" :currentQuestions="questionBank" @update="updateQuestionBank"
      @close="showAdmin = false" />
  </div>
</template>

<style scoped>
/* 樣式保持不變，新增跳過提示 */
.skip-hint { color: #999; font-size: 0.95rem; margin-bottom: 24px; }
/* ... 其他樣式保持不變 ... */
.app-container { max-width: 800px; margin: 0 auto; padding: 40px 20px; min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
header { text-align: center; margin-bottom: 30px; }
header h1 { color: #1cb0f6; font-size: 2.2rem; letter-spacing: -0.5px; margin: 0 0 16px 0; font-weight: 800; }
.header-controls { display: flex; justify-content: center; align-items: center; gap: 16px; }
.progress-bar { padding: 8px 20px; background: #e6f7ff; color: #1cb0f6; border-radius: 20px; font-weight: bold; font-size: 0.95rem; }
.btn-admin { background: #ffc800; color: #fff; border: none; border-bottom: 4px solid #e5b200; padding: 8px 20px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.1s; }
.btn-admin:active { border-bottom-width: 0; transform: translateY(4px); }
.game-card { background: white; border-radius: 24px; padding: 40px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08); border: 2px solid #e5e5e5; flex: 1; display: flex; flex-direction: column; }
.stage-content { display: flex; flex-direction: column; flex: 1; }
.instruction { text-align: center; color: #777; font-size: 1.1rem; margin: 0 0 24px 0; }
.target-noun { text-align: center; font-size: 2rem; font-weight: 800; margin-bottom: 30px; color: #333; }
.highlight { color: #1cb0f6; }
.success-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 20px 0; }
.confetti { font-size: 5rem; margin-bottom: 16px; animation: bounce 1s infinite alternate; }
@keyframes bounce { 0% { transform: translateY(0); } 100% { transform: translateY(-10px); } }
.success-screen h2 { color: #58cc02; font-size: 2.2rem; margin: 0 0 24px 0; font-weight: 800; }
.btn-primary { background-color: #58cc02; color: white; border: none; border-bottom: 5px solid #46a302; padding: 16px 48px; font-size: 1.2rem; font-weight: bold; border-radius: 16px; cursor: pointer; transition: all 0.1s; margin-top: 20px; }
.btn-primary:active { border-bottom-width: 0; transform: translateY(5px); }
@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>