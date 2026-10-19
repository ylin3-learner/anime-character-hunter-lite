<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MacroDragCanvas from './components/MacroDragCanvas.vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import TeacherAdmin from './components/TeacherAdmin.vue';
import ContrastPuzzle from './components/ContrastPuzzle.vue';
import StructuredInput from './components/StructuredInput.vue';
import PronunciationAnalyzer from './components/PronunciationAnalyzer.vue';
import NoticingBoard from './components/NoticingBoard.vue';
import SummaryReport from './components/SummaryReport.vue';
import { defaultQuestions, type QuestionData } from './data/questions';
import { useSound } from './utils/useSound';
import { CloudDatabase } from './services/CloudDatabase';

// 狀態管理
const showAdmin = ref(false);
const currentIndex = ref(0);
const questionBank = ref<QuestionData[]>([]);
const currentStage = ref<'input' | 'macro' | 'micro' | 'success' | 'noticing'>('macro');
const currentMode = ref<'relative' | 'preposition'>('relative');

// 👇 修正：改為 playSuccess
const { playSuccess } = useSound();

// 👇 教師權限驗證狀態
const showAdminAuth = ref(false);
const adminPasswordInput = ref('');
const isAdminAuthenticated = ref(sessionStorage.getItem('admin_auth') === 'true');

// 學習紀錄狀態
const sessionLog = ref<string[]>([]);
const showSummary = ref(false);
const completedCount = ref(0);

onMounted(async () => {
  // 1. 優先嘗試從雲端載入
  const cloudQuestions = await CloudDatabase.fetchQuestions();

  if (cloudQuestions && cloudQuestions.length > 0) {
    questionBank.value = cloudQuestions;
    localStorage.setItem('custom_questions', JSON.stringify(cloudQuestions));
  } else {
    // 2. 雲端沒資料，載入本機備份或預設題庫
    const saved = localStorage.getItem('custom_questions');
    if (saved) {
      try { questionBank.value = JSON.parse(saved); } catch (e) {
        questionBank.value = [...defaultQuestions];
      }
    } else {
      questionBank.value = [...defaultQuestions];
    }
  }
  checkAndSetInitialStage();
});

const currentQuestion = computed(() => questionBank.value[currentIndex.value] || defaultQuestions[0]);

const getEnabledStages = computed(() => {
  return currentQuestion.value.enabledStages || ['input', 'macro', 'micro', 'pronunciation', 'noticing'];
});

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
    currentStage.value = 'success';
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

const handleMisconception = (code: string) => {
  if (!sessionLog.value.includes(code)) {
    sessionLog.value.push(code);
  }
};

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
  // 👇 修正：呼叫 playSuccess
  playSuccess();

  currentStage.value = 'success';
  if (completedCount.value <= currentIndex.value) {
    completedCount.value = currentIndex.value + 1;
  }
};

const nextQuestion = () => {
  window.speechSynthesis.cancel();

  if (currentStage.value === 'success' && getEnabledStages.value.includes('noticing') && currentQuestion.value.noticingData) {
    currentStage.value = 'noticing';
    return;
  }

  if (currentIndex.value < questionBank.value.length - 1) {
    currentIndex.value++;
    checkAndSetInitialStage();
  } else {
    showSummary.value = true;
  }
};

const handleNoticingComplete = () => {
  if (currentIndex.value < questionBank.value.length - 1) {
    currentIndex.value++;
    checkAndSetInitialStage();
  } else {
    showSummary.value = true;
  }
};

const restartGame = () => {
  currentIndex.value = 0;
  sessionLog.value = [];
  completedCount.value = 0;
  showSummary.value = false;
  checkAndSetInitialStage();
};

// 修改更新題庫的邏輯（從 TeacherAdmin 存檔後觸發）
const updateQuestionBank = async (updatedQuestions: QuestionData[]) => {
  // 1. 更新畫面並關閉備課中心
  questionBank.value = updatedQuestions;
  currentIndex.value = 0;
  checkAndSetInitialStage();
  showAdmin.value = false;

  // 2. 存到本機備份（防斷網）
  localStorage.setItem('custom_questions', JSON.stringify(updatedQuestions));

  // 3. 存到雲端資料庫
  const success = await CloudDatabase.saveQuestions(updatedQuestions);
  if (!success) {
    alert('注意：題庫已存在本機，但「雲端同步失敗」，請確認網路連線。');
  }
};

// 👇 教師權限驗證邏輯
const openAdmin = () => {
  if (isAdminAuthenticated.value) {
    showAdmin.value = true;
  } else {
    showAdminAuth.value = true;
  }
};

const verifyAdmin = () => {
  // 預設密碼為 admin123，可自行更改
  if (adminPasswordInput.value === 'admin123') {
    isAdminAuthenticated.value = true;
    sessionStorage.setItem('admin_auth', 'true');
    showAdmin.value = true;
    showAdminAuth.value = false;
    adminPasswordInput.value = '';
  } else {
    alert('密碼錯誤！請聯繫授課教師。');
    adminPasswordInput.value = '';
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
        <button class="btn-finish" @click="showSummary = true">🏁 結束練習</button>
        <!-- 👇 改用 openAdmin 觸發密碼驗證 -->
        <button class="btn-admin" @click="openAdmin">👩‍🏫 教師備課中心</button>
      </div>
    </header>

    <main class="game-card" :key="currentQuestion.id + currentMode">
      <!-- 意識提升歸納板 -->
      <div v-if="currentStage === 'noticing' && currentQuestion.noticingData" class="stage-content"
        style="justify-content: center;">
        <NoticingBoard :data="currentQuestion.noticingData" @complete="handleNoticingComplete" />
      </div>

      <!-- 通關成功畫面 -->
      <div v-else-if="currentStage === 'success'" class="success-screen">
        <div class="confetti">🎉 ✨ 🏆</div>
        <h2>角色解鎖成功！</h2>

        <PronunciationAnalyzer v-if="getEnabledStages.includes('pronunciation')"
          :targetSentence="fullSentenceData.target" :displaySentence="fullSentenceData.display"
          :highlightPart="fullSentenceData.modifier" @skip="nextQuestion" />
        <p v-else class="skip-hint">已略過語音練習。</p>

        <button class="btn-primary mt-4" @click="nextQuestion">
          {{ currentIndex < questionBank.length - 1 ? '下一關 ➔' : '完成練習 🏁' }} </button>
      </div>

      <!-- 對比題型 -->
      <div v-else-if="currentQuestion.type === 'contrast' && currentQuestion.contrastData" class="stage-content">
        <ContrastPuzzle :chineseSentence="currentQuestion.contrastData.chineseSentence"
          :chineseHighlight="currentQuestion.contrastData.chineseHighlight"
          :nounImage="currentQuestion.contrastData.nounImage"
          :modifierImage="currentQuestion.contrastData.modifierImage" :englishNoun="currentQuestion.targetNoun"
          :modifierLabel="currentQuestion.grammarFeature.relative.label"
          :tiles="currentQuestion.grammarFeature.relative.tiles"
          :correctAnswer="currentQuestion.grammarFeature.relative.correctAnswer"
          :antecedent="currentQuestion.antecedent" :layout="currentQuestion.contrastData.layout"
          :explanationTitle="currentQuestion.explanation?.title" :explanationDesc="currentQuestion.explanation?.desc"
          @success="handleSuccess" />
      </div>

      <!-- 標準題型 -->
      <template v-else>
        <div v-if="currentStage === 'input' && currentQuestion.inputData" class="stage-content">
          <StructuredInput :audioText="currentQuestion.inputData.audioText" :options="currentQuestion.inputData.options"
            @success="handleInputSuccess" />
        </div>

        <div v-else-if="currentStage === 'macro'" class="stage-content">
          <h2 class="instruction">請將角色圖塊拖曳到名詞<strong>後方</strong>。</h2>
          <div class="target-noun"><span class="highlight">{{ currentQuestion.targetNoun }}</span></div>
          <MacroDragCanvas :targetNoun="currentQuestion.targetNoun" :grammarFeature="currentQuestion.grammarFeature"
            :imageUrl="currentQuestion.imageUrl" @unpack="handleUnpack" />
        </div>

        <div v-else-if="currentStage === 'micro'" class="stage-content">
          <h2 class="instruction">圖塊已解鎖！請排列出正確的字序。</h2>
          <div class="target-noun"><span class="highlight">{{ currentQuestion.targetNoun }}</span></div>
          <MicroTileUnscramble :initialTiles="currentQuestion.grammarFeature[currentMode].tiles"
            :antecedent="currentQuestion.antecedent"
            :correctAnswer="currentQuestion.grammarFeature[currentMode].correctAnswer" @success="handleSuccess"
            @misconception="handleMisconception" />
        </div>
      </template>
    </main>

    <!-- 總結報告彈窗 -->
    <SummaryReport v-if="showSummary" :completedLevels="completedCount" :totalLevels="questionBank.length"
      :misconceptions="sessionLog" @restart="restartGame" />

    <!-- 👇 教師密碼驗證彈窗 -->
    <div v-if="showAdminAuth" class="auth-overlay">
      <div class="auth-card">
        <h3>👩‍🏫 教師驗證</h3>
        <p>請輸入密碼以進入備課中心</p>
        <!-- 預設密碼: admin123 -->
        <input type="password" v-model="adminPasswordInput" placeholder="" @keyup.enter="verifyAdmin" />
        <div class="auth-actions">
          <button class="btn-cancel" @click="showAdminAuth = false">取消</button>
          <button class="btn-confirm" @click="verifyAdmin">確認</button>
        </div>
      </div>
    </div>

    <TeacherAdmin v-if="showAdmin" :currentQuestions="questionBank" @update="updateQuestionBank"
      @close="showAdmin = false" />
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

header {
  text-align: center;
  margin-bottom: 30px;
}

header h1 {
  color: #1cb0f6;
  font-size: 2.2rem;
  letter-spacing: -0.5px;
  margin: 0 0 16px 0;
  font-weight: 800;
}

.header-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.progress-bar {
  padding: 8px 20px;
  background: #e6f7ff;
  color: #1cb0f6;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.95rem;
}

.btn-finish {
  background: #58cc02;
  color: white;
  border: none;
  border-bottom: 4px solid #46a302;
  padding: 8px 20px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.1s;
}

.btn-finish:active {
  border-bottom-width: 0;
  transform: translateY(4px);
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

.btn-admin:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

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
  margin: 0 0 24px 0;
}

.target-noun {
  text-align: center;
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 30px;
  color: #333;
}

.highlight {
  color: #1cb0f6;
}

.success-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  padding: 20px 0;
}

.confetti {
  font-size: 5rem;
  margin-bottom: 16px;
  animation: bounce 1s infinite alternate;
}

@keyframes bounce {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(-10px);
  }
}

.success-screen h2 {
  color: #58cc02;
  font-size: 2.2rem;
  margin: 0 0 24px 0;
  font-weight: 800;
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
  margin-top: 20px;
}

.btn-primary:active {
  border-bottom-width: 0;
  transform: translateY(5px);
}

.skip-hint {
  color: #999;
  font-size: 0.95rem;
  margin-bottom: 24px;
}

@keyframes popIn {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 👇 教師驗證彈窗樣式 */
.auth-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
  backdrop-filter: blur(4px);
}

.auth-card {
  background: white;
  padding: 32px;
  border-radius: 24px;
  text-align: center;
  width: 320px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  animation: popIn 0.3s;
}

.auth-card h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.5rem;
}

.auth-card p {
  color: #777;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.auth-card input {
  width: 100%;
  padding: 14px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-size: 1rem;
  box-sizing: border-box;
  margin-bottom: 20px;
  outline: none;
  transition: border 0.2s;
}

.auth-card input:focus {
  border-color: #1cb0f6;
}

.auth-actions {
  display: flex;
  gap: 12px;
}

.auth-actions button {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  transition: all 0.1s;
  font-size: 1rem;
}

.btn-cancel {
  background: #f0f0f0;
  color: #777;
}

.btn-confirm {
  background: #1cb0f6;
  color: white;
  border-bottom: 4px solid #1899d6;
}

.btn-confirm:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}
</style>