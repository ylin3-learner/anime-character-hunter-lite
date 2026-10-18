<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue';
import { useSpeechRecognition, useTTS } from '../utils/useSpeech';

const props = defineProps<{
  targetSentence: string;
  displaySentence: string;
  highlightPart: string;
}>();

const { isSupported, startListening } = useSpeechRecognition();
const { speak } = useTTS();

const playbackRate = ref(0.85);
const hasRecording = ref(false);
const transcript = ref('');
const isMatch = ref(false);
const audioUrl = ref<string | null>(null);
const isRecording = ref(false);
const isAnalyzing = ref(false);

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

// 將目標句子拆解成單字陣列，方便做差異比對
const targetWords = computed(() => {
  return props.targetSentence.replace(/\|/g, '').trim().split(/\s+/);
});

// 將辨識結果拆解成單字陣列
const resultWords = computed(() => {
  return transcript.value.trim().split(/\s+/);
});

// 判斷特定單字是否在學生的辨識結果中
const isWordMatched = (word: string) => {
  if (!transcript.value) return false;
  const cleanWord = word.toLowerCase().replace(/[.,?!]/g, '');
  return resultWords.value.some(w => w.toLowerCase().replace(/[.,?!]/g, '').includes(cleanWord));
};

const startRecording = async () => {
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm') && MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }
    
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      if (audioChunks.length > 0) {
        const actualMimeType = mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: actualMimeType });
        audioUrl.value = URL.createObjectURL(audioBlob);
        hasRecording.value = true;
      }

      // 啟動 STT 辨識
      setTimeout(async () => {
        isAnalyzing.value = true;
        try {
          const result = await startListening(props.targetSentence.replace(/\|/g, ''));
          transcript.value = result.text;
          isMatch.value = result.match;
        } catch (err) {
          console.error('STT error:', err);
          transcript.value = '辨識失敗，請重試。';
        } finally {
          isAnalyzing.value = false;
        }
      }, 250);
    };

    mediaRecorder.start();
    isRecording.value = true;
    hasRecording.value = false;
    transcript.value = '';
    isMatch.value = false;
  } catch (err: any) {
    alert('無法啟動麥克風，請確認瀏覽器權限。');
  }
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    isRecording.value = false;
  }
};

const playRecording = () => {
  if (audioUrl.value) {
    new Audio(audioUrl.value).play();
  }
};

onUnmounted(() => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});
</script>

<template>
  <div class="analyzer-container">
    <!-- 句子顯示區 -->
    <div class="sentence-display">
      <span class="text-part">{{ displaySentence.split('|')[0].trim() }}</span>
      <span class="pause-marker"></span>
      <span class="highlight">{{ displaySentence.split('|')[1]?.trim() }}</span>
      <span class="pause-marker"></span>
      <span class="text-part">{{ displaySentence.split('|')[2]?.trim() }}</span>
    </div>

    <!-- 播放速度選擇 -->
    <div class="speed-selector">
      <span class="speed-label">播放速度：</span>
      <button 
        v-for="rate in [0.5, 0.85, 1.0]" 
        :key="rate"
        :class="{ active: playbackRate === rate }"
        @click="playbackRate = rate"
      >
        {{ rate }}x
      </button>
    </div>

    <!-- 操作按鈕 -->
    <div class="controls">
      <button class="btn-audio" @click="speak(targetSentence.replace(/\|/g, ''), playbackRate)">
        🔊 聽標準發音 ({{ playbackRate }}x)
      </button>
      
      <button v-if="!isRecording" class="btn-mic" @click="startRecording" :disabled="!isSupported || isAnalyzing">
        🎤 開始錄音
      </button>

      <button v-if="isRecording" class="btn-mic recording" @click="stopRecording">
        ⏹️ 停止錄音
      </button>

      <button v-if="hasRecording && !isRecording" class="btn-playback" @click="playRecording">
        ▶️ 播放我的錄音
      </button>
    </div>

    <!-- 🎯 核心：文字差異對照面板 -->
    <div v-if="hasRecording || isAnalyzing" class="result-panel">
      <div class="word-comparison">
        <!-- 顯示目標句子，把學生沒唸出來的單字變灰色 -->
        <div class="target-line">
          <span 
            v-for="(word, index) in targetWords" 
            :key="index"
            class="word"
            :class="isWordMatched(word) ? 'matched' : 'missed'"
          >
            {{ word }}
          </span>
        </div>
        
        <!-- 顯示學生的辨識結果 -->
        <div class="result-line">
          <p v-if="isAnalyzing" class="status-text">⏳ 正在分析發音...</p>
          <p v-else-if="isMatch" class="status-text success">✅ 太棒了！發音完全正確。</p>
          <p v-else class="status-text error">⚠️ 辨識結果有些落差，請點擊播放聽聽看。</p>
          
          <p class="transcript-text" :class="{ 'has-error': !isMatch }">
            「{{ transcript || '未辨識出聲音' }}」
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analyzer-container { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 600px; margin: 0 auto; gap: 20px; }

.sentence-display {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; font-size: 1.4rem; line-height: 1.8; color: #333; background: #f9f9f9; padding: 16px 24px; border-radius: 12px; border: 2px dashed #ccc; text-align: center; width: 100%; box-sizing: border-box;
}
.sentence-display .highlight { color: #ea2b2b; font-weight: 800; background: #ffe6e6; padding: 2px 8px; border-radius: 6px; }
.pause-marker { display: inline-block; width: 4px; height: 24px; background: #1cb0f6; border-radius: 2px; }

.speed-selector { display: flex; align-items: center; gap: 8px; background: #f0f0f0; padding: 6px 12px; border-radius: 20px; }
.speed-label { font-size: 0.9rem; color: #666; font-weight: bold; }
.speed-selector button { background: none; border: none; padding: 4px 12px; border-radius: 12px; font-weight: bold; color: #777; cursor: pointer; transition: all 0.2s; }
.speed-selector button.active { background: white; color: #1cb0f6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.controls { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
button { padding: 12px 20px; border-radius: 12px; font-weight: bold; font-size: 1rem; cursor: pointer; border: none; transition: all 0.1s; }
.btn-audio { background: #e6f7ff; color: #1cb0f6; border: 2px solid #1cb0f6; }
.btn-mic { background: #1cb0f6; color: white; border-bottom: 4px solid #1899d6; }
.btn-mic.recording { background: #ff4b4b; border-bottom-color: #cc0000; }
.btn-playback { background: #58cc02; color: white; border-bottom: 4px solid #46a302; }
button:active { border-bottom-width: 0; transform: translateY(4px); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

/* 🎯 文字對照面板樣式 */
.result-panel {
  width: 100%;
  background: white;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  padding: 20px;
  text-align: left;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.word-comparison { display: flex; flex-direction: column; gap: 16px; }

.target-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 1.2rem;
  line-height: 1.6;
}

.word {
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s;
}

/* 學生有唸出來的單字：綠色 */
.word.matched {
  background: #e6f7e6;
  color: #1c9c1c;
  font-weight: bold;
}

/* 學生漏掉或發音錯的單字：灰色+刪除線 */
.word.missed {
  background: #f0f0f0;
  color: #999;
  text-decoration: line-through;
}

.result-line {
  border-top: 2px dashed #eee;
  padding-top: 16px;
}

.status-text { font-weight: bold; margin-bottom: 8px; }
.status-text.success { color: #58cc02; }
.status-text.error { color: #ff4b4b; }

.transcript-text {
  color: #555;
  font-size: 1.1rem;
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
  margin: 0;
}
.transcript-text.has-error { color: #ea2b2b; background: #ffe6e6; }
</style>