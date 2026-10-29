<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import MacroDragCanvas from './components/MacroDragCanvas.vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import TeacherAdmin from './components/TeacherAdmin.vue';
import TeacherAnalytics from './components/TeacherAnalytics.vue';
import ContrastPuzzle from './components/ContrastPuzzle.vue';
import StructuredInput from './components/StructuredInput.vue';
import PronunciationAnalyzer from './components/PronunciationAnalyzer.vue';
import NoticingBoard from './components/NoticingBoard.vue';
import SummaryReport from './components/SummaryReport.vue';
import ChunkPreview from './components/ChunkPreview.vue';
import DebugConsole from './components/DebugConsole.vue';

import { defaultQuestions } from './data/questions';
import type { QuestionData } from './rules/types';
import { useSound, unlockAudioContext } from './utils/useSound';
import { unlockTTS } from './utils/useSpeech';
import { CloudDatabase } from './services/CloudDatabase';

import { useQuizTimer } from './composables/useQuizTimer';
import { useFocusMonitor } from './composables/useFocusMonitor';
import { useClassroomSync } from './composables/useClassroomSync'; // 👈 引入 Realtime

const isDebugMode = window.location.search.includes('debug=1');

const showAdmin = ref(false);
const showAnalytics = ref(false);
const pendingAction = ref<'admin' | 'analytics' | null>(null);
const currentIndex = ref(0);
const questionBank = ref<QuestionData[]>([]);
const currentStage = ref<'preview' | 'input' | 'macro' | 'micro' | 'success' | 'noticing'>('preview');
const currentMode = ref<'relative' | 'preposition'>('relative');

// 解構 Classroom Sync
const { joinRoom, sendPush, sendAddTime, leaveRoom } = useClassroomSync();

const { playSuccess, playError, playWarningBeep } = useSound();

const showAdminAuth = ref(false);
const adminPasswordInput = ref('');
const isAdminAuthenticated = ref(sessionStorage.getItem('admin_auth') === 'true');
const sessionLog = ref<string[]>([]);
const showSummary = ref(false);
const completedCount = ref(0);

// ==========================================
// 1. 防切屏與計時器邏輯
// ==========================================
const showFocusWarning = ref(false);

const handleDistracted = () => {
  playWarningBeep();
  showFocusWarning.value = true;
  setTimeout(() => { showFocusWarning.value = false; }, 3000);
};

useFocusMonitor(handleDistracted);

const { timeLeft, isTimeUp, startTimer, addTime, clearTimer } = useQuizTimer(() => {
  playError();
});

// ==========================================
// 2. 初始化與 Realtime 連線
// ==========================================
const handleGlobalInteraction = () => {
  unlockAudioContext();
  unlockTTS();
  document.removeEventListener('pointerdown', handleGlobalInteraction);
  document.removeEventListener('touchstart', handleGlobalInteraction);
};

onMounted(async () => {
  document.addEventListener('pointerdown', handleGlobalInteraction);
  document.addEventListener('touchstart', handleGlobalInteraction);

  const cloudQuestions = await CloudDatabase.fetchQuestions();
  if (cloudQuestions && cloudQuestions.length > 0) {
    questionBank.value = cloudQuestions;
    localStorage.setItem('custom_questions', JSON.stringify(cloudQuestions));
  } else {
    const saved = localStorage.getItem('custom_questions');
    if (saved) {
      try { questionBank.value = JSON.parse(saved); } catch (e) { questionBank.value = [...defaultQuestions] as unknown as QuestionData[]; }
    } else {
      questionBank.value = [...defaultQuestions] as unknown as QuestionData[];
    }
  }
  fixAntecedentNumbers();
  checkAndSetInitialStage();

  // 確保 joinRoom 被正確呼叫
  joinRoom((event, payload) => {
    if (event === 'SYNC_STATE') {
      const targetId = payload.id;
      const targetEndTime = payload.timerEndTime;

      // 1. 檢查題目是否需要切換
      if (targetId && currentQuestion.value.id !== targetId) {
        console.log('📡 題目已切換至:', targetId);
        const idx = questionBank.value.findIndex(q => q.id === targetId);
        if (idx !== -1) {
          currentIndex.value = idx;
          checkAndSetInitialStage();
        }
      }

      // 2. 檢查計時器是否需要更新
      if (targetEndTime) {
        const remaining = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
        console.log(`📡 更新計時器，剩餘秒數: ${remaining}`);

        // 👈 關鍵修正：強制將本地的題目狀態改為限時，這樣 UI 才會顯示倒數條！
        if (currentQuestion.value) {
          currentQuestion.value.isTimed = true;
          currentQuestion.value.timeLimit = remaining;
        }

        startTimer(remaining);
      } else {
        clearTimer();
      }
    }
  });
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleGlobalInteraction);
  document.removeEventListener('touchstart', handleGlobalInteraction);
  leaveRoom(); // 離開房間
});

const fixAntecedentNumbers = () => {
  questionBank.value.forEach(q => {
    if (q.targetNoun.toLowerCase().endsWith('s') && !q.targetNoun.toLowerCase().endsWith('is') && !q.targetNoun.toLowerCase().endsWith('this')) {
      q.antecedent.number = 'plural';
    }
  });
};

// ==========================================
// 3. 核心狀態與流程控制
// ==========================================
const currentQuestion = computed(() => questionBank.value[currentIndex.value] || (defaultQuestions[0] as unknown as QuestionData));
const getEnabledStages = computed(() => currentQuestion.value.enabledStages || ['input', 'macro', 'micro', 'pronunciation', 'noticing']);

watch(
  [() => currentQuestion.value?.id, () => currentQuestion.value?.timeLimit, () => currentQuestion.value?.isTimed, currentStage],
  ([newId, newTimeLimit, isTimed, newStage], [oldId, oldTimeLimit, oldIsTimed, oldStage]) => {
    const isTestingPhase = ['input', 'macro', 'micro'].includes(newStage);
    if (isTestingPhase && isTimed && newTimeLimit) {
      if (newId !== oldId || newTimeLimit !== oldTimeLimit || (!['input', 'macro', 'micro'].includes(oldStage || '') && isTestingPhase)) {
        startTimer(newTimeLimit);
      }
    } else {
      if (!isTestingPhase || !isTimed) {
        clearTimer();
      }
    }
  },
  { immediate: true }
);

const checkAndSetInitialStage = () => {
  if (currentQuestion.value.type === 'contrast') { currentStage.value = 'macro'; return; }
  if (currentQuestion.value.type === 'chunk') { currentStage.value = 'preview'; return; }
  if (currentQuestion.value.previewData && getEnabledStages.value.includes('input')) currentStage.value = 'preview';
  else if (getEnabledStages.value.includes('input') && currentQuestion.value.inputData) currentStage.value = 'input';
  else if (getEnabledStages.value.includes('macro')) currentStage.value = 'macro';
  else if (getEnabledStages.value.includes('micro')) currentStage.value = 'micro';
  else currentStage.value = 'success';
};

const handlePreviewSuccess = () => { currentQuestion.value.type === 'chunk' ? handleSuccess() : currentStage.value = 'input'; };

const fullSentenceData = computed(() => {
  const noun = currentQuestion.value.targetNoun;
  const modifier = currentQuestion.value.type === 'contrast' ? currentQuestion.value.grammarFeature.relative.label : currentQuestion.value.grammarFeature[currentMode.value].label;
  return { target: `${noun} ${modifier} is my favorite.`, display: `${noun} | ${modifier} | is my favorite.`, modifier };
});

const handleMisconception = (code: string) => {
  if (!sessionLog.value.includes(code)) sessionLog.value.push(code);
  CloudDatabase.logEvent({ student_name: '匿名學生', question_id: currentQuestion.value.id, error_code: code });
};

const handleInputSuccess = () => {
  if (getEnabledStages.value.includes('macro')) currentStage.value = 'macro';
  else if (getEnabledStages.value.includes('micro')) currentStage.value = 'micro';
  else currentStage.value = 'success';
};

const handleUnpack = (type: 'relative' | 'preposition') => { currentMode.value = type; currentStage.value = 'micro'; };
const handleSuccess = () => { playSuccess(); currentStage.value = 'success'; if (completedCount.value <= currentIndex.value) completedCount.value = currentIndex.value + 1; };

const nextQuestion = () => {
  window.speechSynthesis.cancel();
  if (currentStage.value === 'success' && getEnabledStages.value.includes('noticing') && currentQuestion.value.noticingData) { currentStage.value = 'noticing'; return; }
  if (currentIndex.value < questionBank.value.length - 1) { currentIndex.value++; checkAndSetInitialStage(); } else { showSummary.value = true; }
};

const handleNoticingComplete = () => {
  if (currentIndex.value < questionBank.value.length - 1) { currentIndex.value++; checkAndSetInitialStage(); } else { showSummary.value = true; }
};

const restartGame = () => { currentIndex.value = 0; sessionLog.value = []; completedCount.value = 0; showSummary.value = false; checkAndSetInitialStage(); };

// ==========================================
// 4. 老師端指令處理 (Master)
// ==========================================
const updateQuestionBank = async (updatedQuestions: QuestionData[]) => {
  const currentIdx = currentIndex.value;
  questionBank.value = updatedQuestions;
  fixAntecedentNumbers();
  showAdmin.value = false;

  if (currentIdx >= questionBank.value.length) {
    currentIndex.value = Math.max(0, questionBank.value.length - 1);
  } else {
    currentIndex.value = currentIdx;
  }

  localStorage.setItem('custom_questions', JSON.stringify(updatedQuestions));
  const success = await CloudDatabase.saveQuestions(updatedQuestions);
  if (!success) alert('注意：題庫已存在本機，但「雲端同步失敗」，請確認網路連線。');
};

const handleLocalSync = (updatedQuestions: QuestionData[]) => {
  questionBank.value = updatedQuestions;
};

// 接收 TeacherAdmin 的 push 事件，並廣播給全班
const handlePushQuestion = (id: string) => {
  const idx = questionBank.value.findIndex(q => q.id === id);
  if (idx !== -1) {
    const targetQ = questionBank.value[idx];
    currentIndex.value = idx;
    checkAndSetInitialStage();
    showAdmin.value = false;

    let endTime = null;
    if (targetQ.isTimed && targetQ.timeLimit) {
      endTime = Date.now() + targetQ.timeLimit * 1000;
      startTimer(targetQ.timeLimit);
    } else {
      clearTimer();
    }

    // 👈 呼叫 API 發送指令，並帶上老師的驗證密碼
    const pwd = sessionStorage.getItem('admin_auth') ? 'admin123' : '';
    sendPush(targetQ, endTime, pwd);
  }
};

// 新增：處理加時（本地 UI 更新 + Realtime 廣播）
const handleAddTime = (seconds: number) => {
  // 1. 本地先加
  addTime(seconds);

  // 2. 計算新的結束時間並廣播
  // 注意：這裡需要拿到目前計時器的剩餘時間來推算新的 endTime
  // 但最簡單的方式是：直接廣播一個新的結束時間
  const newEndTime = Date.now() + (timeLeft.value + seconds) * 1000;

  const pwd = sessionStorage.getItem('admin_auth') ? 'admin123' : '';
  sendAddTime(newEndTime, pwd);
};

const handleTimeoutNext = () => { nextQuestion(); };

const openAdmin = () => { if (isAdminAuthenticated.value) showAdmin.value = true; else { pendingAction.value = 'admin'; showAdminAuth.value = true; } };
const openAnalytics = () => { if (isAdminAuthenticated.value) showAnalytics.value = true; else { pendingAction.value = 'analytics'; showAdminAuth.value = true; } };
const verifyAdmin = () => {
  if (adminPasswordInput.value === 'admin123') {
    isAdminAuthenticated.value = true; sessionStorage.setItem('admin_auth', 'true'); showAdminAuth.value = false; adminPasswordInput.value = '';
    if (pendingAction.value === 'admin') showAdmin.value = true;
    else if (pendingAction.value === 'analytics') showAnalytics.value = true;
    pendingAction.value = null;
  } else { alert('密碼錯誤！請聯繫授課教師。'); adminPasswordInput.value = ''; }
};
const cancelAuth = () => { showAdminAuth.value = false; adminPasswordInput.value = ''; pendingAction.value = null; };
const logoutAdmin = () => {
  if (confirm('確定要登出教師模式嗎？')) {
    // 1. 清除驗證狀態
    isAdminAuthenticated.value = false;
    sessionStorage.removeItem('admin_auth');

    // 2. 關閉備課中心（如果有開著的話）
    showAdmin.value = false;

    // 3. (可選) 如果正在進行計時，可以決定是否要保留。通常登出不會影響學生端，所以保持原狀即可。
    console.log('👋 [Auth] 教師已登出，交還控制權');
  }
};
</script>

<template>
  <div class="app-container">
    <Transition name="fade">
      <div v-if="showFocusWarning" class="focus-warning-overlay">
        <div class="warning-box">
          <h2>⚠️ 請保持專注！</h2>
          <p>偵測到您切換了畫面，請回到學習任務。</p>
        </div>
      </div>
    </Transition>

    <div v-if="currentQuestion.isTimed && !isTimeUp && ['input', 'macro', 'micro'].includes(currentStage)"
      class="timer-bar" :class="{ 'urgent': timeLeft <= 10 }">
      ⏱️ 剩餘時間：{{ timeLeft }} 秒
      <button v-if="isAdminAuthenticated" class="btn-add-time" @click="handleAddTime(30)">+30s</button>
    </div>

    <Transition name="fade">
      <div v-if="isTimeUp" class="timeout-overlay">
        <div class="timeout-box">
          <h2>⏰ 時間到！</h2>
          <p>挑戰失敗，請再接再厲！</p>
          <button class="btn-timeout-next" @click="handleTimeoutNext">進入下一題 ➔</button>
        </div>
      </div>
    </Transition>

    <header>
      <h1>🕵️ Anime Character Hunter</h1>
      <div class="header-controls">
        <div class="progress-bar">第 {{ currentIndex + 1 }} / {{ questionBank.length }} 關</div>
        <button class="btn-finish" @click="showSummary = true">🏁 結束練習</button>
        <!-- 只有已驗證的老師才看得到備課中心與登出按鈕 -->
        <template v-if="isAdminAuthenticated">
          <button class="btn-admin" @click="openAdmin">👩‍🏫 教師備課中心</button>
          <button class="btn-logout" @click="logoutAdmin">🚪 登出教師</button>
        </template>
        <button class="btn-analytics" @click="openAnalytics">📊 數據分析</button>
      </div>
    </header>

    <main class="game-card" :key="currentQuestion.id + currentMode">
      <div v-if="currentStage === 'noticing' && currentQuestion.noticingData" class="stage-content"
        style="justify-content: center;">
        <NoticingBoard :data="currentQuestion.noticingData" @complete="handleNoticingComplete" />
      </div>

      <div v-else-if="currentStage === 'success'" class="success-screen">
        <div class="confetti">🎉 ✨ 🏆</div>
        <h2>角色解鎖成功！</h2>
        <PronunciationAnalyzer v-if="getEnabledStages.includes('pronunciation')"
          :targetSentence="fullSentenceData.target" :displaySentence="fullSentenceData.display"
          :highlightPart="fullSentenceData.modifier" :speechRate="currentQuestion.speechRate || 0.8"
          @skip="nextQuestion" />
        <p v-else class="skip-hint">已略過語音練習。</p>
        <button class="btn-primary mt-4" @click="nextQuestion">
          {{ currentIndex < questionBank.length - 1 ? '下一關 ➔' : '完成練習 🏁' }} </button>
      </div>

      <div v-else-if="currentQuestion.type === 'contrast' && currentQuestion.contrastData" class="stage-content">
        <ContrastPuzzle :chineseSentence="currentQuestion.contrastData.chineseSentence"
          :chineseHighlight="currentQuestion.contrastData.chineseHighlight"
          :nounImage="currentQuestion.contrastData.nounImage"
          :modifierImage="currentQuestion.contrastData.modifierImage" :englishNoun="currentQuestion.targetNoun"
          :modifierLabel="currentQuestion.grammarFeature.relative.label" :antecedent="currentQuestion.antecedent"
          :layout="currentQuestion.contrastData.layout" :explanationTitle="currentQuestion.explanation?.title"
          :explanationDesc="currentQuestion.explanation?.desc" @success="handleSuccess"
          @misconception="handleMisconception" />
      </div>

      <div v-else-if="currentStage === 'preview' && currentQuestion.previewData" class="stage-content">
        <ChunkPreview :image="currentQuestion.previewData.targetImage" :noun="currentQuestion.previewData.targetNoun"
          :chunk="currentQuestion.previewData.chunkText" :zhMeaning="currentQuestion.previewData.chunkZh"
          :quizOptions="currentQuestion.previewData.quizOptions" :speechRate="currentQuestion.speechRate || 0.8"
          @success="handlePreviewSuccess" />
      </div>

      <div v-else-if="currentStage === 'input' && currentQuestion.inputData" class="stage-content">
        <StructuredInput :audioText="currentQuestion.inputData.audioText" :options="currentQuestion.inputData.options"
          :speechRate="currentQuestion.speechRate || 0.8" @success="handleInputSuccess" />
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
        <MicroTileUnscramble :initialTiles="currentQuestion.mode === 'reduce'
            ? currentQuestion.grammarFeature.relative.correctAnswer  // 👈 Reduce 模式傳入原句順序
            : currentQuestion.grammarFeature[currentMode].tiles      // Build 模式傳入打亂的
          " :antecedent="currentQuestion.antecedent" :correctAnswer="currentQuestion.mode === 'reduce'
                ? currentQuestion.grammarFeature.preposition.correctAnswer
                : currentQuestion.grammarFeature[currentMode].correctAnswer
              " :mode="currentQuestion.mode || 'build'" :contextCloze="currentQuestion.contextCloze"
          :speechRate="currentQuestion.speechRate || 0.8" @success="handleSuccess"
          @misconception="handleMisconception" />
      </div>
    </main>

    <SummaryReport v-if="showSummary" :completedLevels="completedCount" :totalLevels="questionBank.length"
      :misconceptions="sessionLog" @restart="restartGame" />

    <TeacherAnalytics v-if="showAnalytics" :questionBank="questionBank" @close="showAnalytics = false" />

    <div v-if="showAdminAuth" class="auth-overlay">
      <div class="auth-card">
        <h3>👩‍🏫 教師驗證</h3>
        <p>請輸入密碼以進入系統</p>
        <input type="password" v-model="adminPasswordInput" placeholder="" @keyup.enter="verifyAdmin" />
        <div class="auth-actions">
          <button class="btn-cancel" @click="cancelAuth">取消</button>
          <button class="btn-confirm" @click="verifyAdmin">確認</button>
        </div>
      </div>
    </div>

    <!-- 👈 確保這裡傳遞了正確的事件 -->
    <TeacherAdmin v-if="showAdmin" :currentQuestions="questionBank" @update="updateQuestionBank"
      @sync-local="handleLocalSync" @push="handlePushQuestion" @close="showAdmin = false" />

    <DebugConsole v-if="isDebugMode" />
  </div>
</template>

<style scoped>
/* 樣式保持不變 */
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

.btn-analytics {
  background: #9c27b0;
  color: white;
  border: none;
  border-bottom: 4px solid #7b1fa2;
  padding: 8px 20px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.1s;
}

.btn-analytics:active {
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

.focus-warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 75, 75, 0.15);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  pointer-events: none;
}

.warning-box {
  background: white;
  padding: 24px 40px;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(255, 75, 75, 0.3);
  border: 3px solid #ff4b4b;
  text-align: center;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.warning-box h2 {
  color: #ff4b4b;
  margin: 0 0 8px 0;
  font-size: 1.5rem;
}

.warning-box p {
  color: #555;
  margin: 0;
  font-weight: bold;
}

.timer-bar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #e6f7ff;
  color: #1cb0f6;
  padding: 8px 24px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 1.2rem;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(28, 176, 246, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
}

.timer-bar.urgent {
  background: #ffe6e6;
  color: #ff4b4b;
  animation: pulse 1s infinite;
}

.btn-add-time {
  background: #1cb0f6;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.btn-add-time:active {
  transform: scale(0.95);
}

.timeout-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.timeout-box {
  background: white;
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  border: 4px solid #ff4b4b;
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.timeout-box h2 {
  color: #ff4b4b;
  font-size: 2rem;
  margin: 0 0 12px 0;
}

.timeout-box p {
  color: #777;
  font-size: 1.1rem;
  margin-bottom: 24px;
}

.btn-timeout-next {
  background: #ff4b4b;
  color: white;
  border: none;
  border-bottom: 4px solid #cc0000;
  padding: 16px 32px;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-timeout-next:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.btn-logout {
  background: #f0f0f0;
  color: #777;
  border: none;
  border-bottom: 4px solid #ccc;
  padding: 8px 20px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.1s;
}

.btn-logout:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}
</style>