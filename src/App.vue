<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MacroDragCanvas from './components/MacroDragCanvas.vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import TeacherAdmin from './components/TeacherAdmin.vue';
import ContrastPuzzle from './components/ContrastPuzzle.vue';
import { defaultQuestions, type QuestionData } from './data/questions';
import { useTTS, useSpeechRecognition } from './utils/useSpeech';

const showAdmin = ref(false);
const currentIndex = ref(0);
const questionBank = ref<QuestionData[]>([]);
const currentStage = ref<'macro' | 'micro' | 'success'>('macro');
const currentMode = ref<'relative' | 'preposition'>('relative');

// 初始化 TTS 與 STT
const { speak } = useTTS();
const { isListening, isSupported, startListening } = useSpeechRecognition();
const voiceSuccess = ref(false);
const voiceFailed = ref(false);

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

// 取得當前要「朗讀與測驗」的目標修飾語 (只抓紅字部分)
const targetModifier = computed(() => {
  if (currentQuestion.value.type === 'contrast') {
    return currentQuestion.value.modifiers.relative.label;
  }
  return currentQuestion.value.modifiers[currentMode.value].label;
});

const handleUnpack = (type: 'relative' | 'preposition') => {
  currentMode.value = type;
  currentStage.value = 'micro';
};

// 進入通關畫面，並自動播放 TTS
const handleSuccess = () => {
  currentStage.value = 'success';
  voiceSuccess.value = false;
  voiceFailed.value = false;
  
  // 延遲 0.5 秒讓畫面動畫跑完，只唸出目標文法區塊
  setTimeout(() => {
    speak(targetModifier.value);
  }, 500);
};

const nextQuestion = () => {
  // 停止任何正在播放的語音
  window.speechSynthesis.cancel();
  
  if (currentIndex.value < questionBank.value.length - 1) {
    currentIndex.value++;
    currentStage.value = 'macro';
  } else {
    currentIndex.value = 0;
    currentStage.value = 'macro';
  }
};

// 手動點擊播放 TTS
const playAudio = () => {
  speak(targetModifier.value);
};

// 啟動語音辨識
const checkPronunciation = async () => {
  voiceFailed.value = false;
  // 只比對目標文法區塊
  const result = await startListening(targetModifier.value);
  
  if (result) {
    voiceSuccess.value = true;
  } else {
    voiceFailed.value = true;
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
      
      <!-- 🎯 通關成功畫面 (所有題型共用) -->
      <div v-if="currentStage === 'success'" class="success-screen">
        <div class="confetti">🎉 ✨ 🏆</div>
        <h2>角色解鎖成功！</h2>
        
        <!-- 句子展示：紅字部分為目標 -->
        <div class="success-sentence">
          {{ currentQuestion.targetNoun }} 
          <span class="highlight-red">{{ targetModifier }}</span> 
          is my favorite.
        </div>
        <p class="speak-hint">👉 請大聲唸出<span class="highlight-red">紅色</span>的部分！</p>

        <!-- 語音互動區塊 -->
        <div class="voice-actions">
          <button class="btn-audio" @click="playAudio">
            🔊 聆聽發音
          </button>
          
          <button 
            v-if="isSupported" 
            class="btn-mic" 
            :class="{ 'listening': isListening, 'success': voiceSuccess, 'error': voiceFailed }"
            @click="checkPronunciation"
            :disabled="isListening"
          >
            <span v-if="isListening">🎙️ 正在聆聽...</span>
            <span v-else-if="voiceSuccess">✅ 發音完美！</span>
            <span v-else-if="voiceFailed">❌ 再試一次 (點擊錄音)</span>
            <span v-else>🎤 換你唸唸看</span>
          </button>
          <p v-else class="no-mic-hint">您的瀏覽器不支援麥克風功能</p>
        </div>

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
          :modifierLabel="currentQuestion.modifiers.relative.label"
          :tiles="currentQuestion.modifiers.relative.tiles"
          :correctAnswer="currentQuestion.modifiers.relative.correctAnswer"
          :antecedent="currentQuestion.antecedent"
          @success="handleSuccess"
        />
      </div>

      <!-- 🎯 類型二：標準題型 (非通關階段) -->
      <template v-else>
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

/* 紅字高亮：加深背景，強化視覺 */
.highlight-red { 
  color: #ea2b2b; 
  font-weight: 800;
  background: #ffe6e6;
  padding: 2px 6px;
  border-radius: 6px;
}

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
  margin-bottom: 10px; /* 縮小與提示文字的距離 */
  line-height: 1.6;
  color: #333;
  max-width: 90%;
}

/* 語音提示文字 */
.speak-hint {
  font-size: 1rem;
  color: #777;
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 20px;
}

/* 🎤 語音互動區塊樣式 */
.voice-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.btn-audio {
  background: #e6f7ff;
  color: #1cb0f6;
  border: 2px solid #1cb0f6;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-audio:hover { background: #1cb0f6; color: white; }

.btn-mic {
  background: #f0f0f0;
  color: #555;
  border: 2px solid #ccc;
  border-bottom-width: 4px;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.1s;
}
.btn-mic.listening {
  background: #ffebee;
  color: #ea2b2b;
  border-color: #ea2b2b;
  animation: pulse 1.5s infinite;
}
.btn-mic.success {
  background: #d7ffb8;
  color: #58cc02;
  border-color: #58cc02;
}
.btn-mic.error {
  background: #ffe6e6;
  color: #ea2b2b;
  border-color: #ea2b2b;
}

.no-mic-hint {
  color: #999;
  font-size: 0.9rem;
}

.mt-4 { margin-top: 16px; }

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(234, 43, 43, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(234, 43, 43, 0); }
  100% { box-shadow: 0 0 0 0 rgba(234, 43, 43, 0); }
}

/* 主按鈕 */
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