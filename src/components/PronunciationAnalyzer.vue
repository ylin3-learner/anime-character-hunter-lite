<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useTTS } from '../utils/useSpeech';

const props = defineProps<{
  targetSentence: string;
  displaySentence: string;
  highlightPart: string;
  speechRate?: number;
}>();

const emit = defineEmits<{ (e: 'skip'): void; }>();
const { speak } = useTTS();

const playbackRate = ref(props.speechRate || 0.85);
const hasRecording = ref(false);
const audioUrl = ref<string | null>(null);
const isRecording = ref(false);

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

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
    };

    mediaRecorder.start();
    isRecording.value = true;
    hasRecording.value = false;
  } catch (err: any) {
    console.error('🚨 無法啟動錄音:', err);
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
    <div class="sentence-display">
      <span class="text-part">{{ displaySentence.split('|')[0].trim() }}</span>
      <span class="pause-marker"></span>
      <span class="highlight">{{ displaySentence.split('|')[1]?.trim() }}</span>
      <span class="pause-marker"></span>
      <span class="text-part">{{ displaySentence.split('|')[2]?.trim() }}</span>
    </div>

    <div class="speed-selector">
      <span class="speed-label">播放速度：</span>
      <button v-for="rate in [0.5, 0.85, 1.0]" :key="rate" :class="{ active: playbackRate === rate }"
        @click="playbackRate = rate">
        {{ rate }}x
      </button>
    </div>

    <div class="controls">
      <button class="btn-audio" @click="speak(targetSentence.replace(/\|/g, ''), { rate: playbackRate })">
        🔊 聽標準發音
      </button>

      <button v-if="!isRecording" class="btn-mic" @click="startRecording">
        🎤 開始錄音
      </button>

      <button v-if="isRecording" class="btn-mic recording" @click="stopRecording">
        ⏹️ 停止錄音
      </button>

      <button v-if="hasRecording && !isRecording" class="btn-playback" @click="playRecording">
        ▶️ 播放我的錄音
      </button>

      <button v-if="!isRecording" class="btn-skip" :class="{ 'is-primary': hasRecording }" @click="emit('skip')">
        {{ hasRecording ? '✅ 聽完錄音，繼續遊戲' : '⏭️ 跳過語音' }}
      </button>
    </div>

    <!-- 錄音後的提示區塊 -->
    <div v-if="hasRecording && !isRecording" class="result-panel" style="text-align: center;">
      <p style="color: #58cc02; font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">
        🎧 錄音完成！
      </p>
      <p style="color: #777;">
        請點擊「播放我的錄音」聽聽看自己的發音，確認無誤後點擊下方按鈕繼續。
      </p>
    </div>
  </div>
</template>

<style scoped>
.btn-skip {
  background: #f0f0f0;
  color: #777;
  border-bottom: 4px solid #ccc;
}

.btn-skip:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

.btn-skip.is-primary {
  background: #58cc02;
  color: white;
  border-bottom-color: #46a302;
}

.btn-skip.is-primary:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

.analyzer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  gap: 20px;
}

.sentence-display {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1.4rem;
  line-height: 1.8;
  color: #333;
  background: #f9f9f9;
  padding: 16px 24px;
  border-radius: 12px;
  border: 2px dashed #ccc;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.sentence-display .highlight {
  color: #ea2b2b;
  font-weight: 800;
  background: #ffe6e6;
  padding: 2px 8px;
  border-radius: 6px;
}

.pause-marker {
  display: inline-block;
  width: 4px;
  height: 24px;
  background: #1cb0f6;
  border-radius: 2px;
}

.speed-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f0f0;
  padding: 6px 12px;
  border-radius: 20px;
}

.speed-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: bold;
}

.speed-selector button {
  background: none;
  border: none;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
  color: #777;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-selector button.active {
  background: white;
  color: #1cb0f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

button {
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  transition: all 0.1s;
}

.btn-audio {
  background: #e6f7ff;
  color: #1cb0f6;
  border: 2px solid #1cb0f6;
}

.btn-mic {
  background: #1cb0f6;
  color: white;
  border-bottom: 4px solid #1899d6;
}

.btn-mic.recording {
  background: #ff4b4b;
  border-bottom-color: #cc0000;
}

.btn-playback {
  background: #58cc02;
  color: white;
  border-bottom: 4px solid #46a302;
}

button:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-panel {
  width: 100%;
  background: white;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
</style>