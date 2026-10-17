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

const hasRecording = ref(false);
const transcript = ref('');
const isMatch = ref(false);
const audioUrl = ref<string | null>(null);
const isRecording = ref(false);

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationId: number;
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 解析句子，拆分為「停頓前」、「高亮主體」、「停頓後」
const sentenceParts = computed(() => {
  const parts = props.displaySentence.split('|');
  if (parts.length >= 3) {
    return {
      before: parts[0].trim(),
      highlight: parts[1].trim(),
      after: parts[2].trim()
    };
  }
  return { before: '', highlight: props.displaySentence, after: '' };
});

// 畫波形
const drawWaveform = () => {
  if (!canvasRef.value || !analyser) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1cb0f6';
  ctx.beginPath();

  const sliceWidth = (canvas.width * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  if (isRecording.value) {
    animationId = requestAnimationFrame(drawWaveform);
  }
};

// 開始錄音
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();
    
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 2048;

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioUrl.value = URL.createObjectURL(audioBlob);
      hasRecording.value = true;
    };

    mediaRecorder.start();
    isRecording.value = true;
    hasRecording.value = false;
    transcript.value = '';
    isMatch.value = false;
    
    drawWaveform();
  } catch (err) {
    alert('無法存取麥克風，請確認權限設定。');
  }
};

// 停止錄音並觸發辨識
const stopRecording = async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    isRecording.value = false;
    cancelAnimationFrame(animationId);
    
    // 開始語音辨識
    const result = await startListening(props.targetSentence.replace(/\|/g, ''));
    transcript.value = result.text;
    isMatch.value = result.match;
  }
};

const playRecording = () => {
  if (audioUrl.value) new Audio(audioUrl.value).play();
};

onUnmounted(() => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});
</script>

<template>
  <div class="analyzer-container">
    <!-- 句子顯示區：用 Flex 排版，確保單字不擁擠 -->
    <div class="sentence-display">
      <span class="text-part">{{ sentenceParts.before }}</span>
      <span class="pause-marker"></span>
      <span class="highlight">{{ sentenceParts.highlight }}</span>
      <span class="pause-marker"></span>
      <span class="text-part">{{ sentenceParts.after }}</span>
    </div>

    <!-- 波形圖框 -->
    <div class="waveform-box" :class="{ 'is-recording': isRecording }">
      <canvas ref="canvasRef" width="400" height="60"></canvas>
      <p v-if="!isRecording && !hasRecording" class="wave-hint">點擊下方按鈕開始朗讀</p>
      <p v-if="isRecording" class="wave-hint recording">🎙️ 正在聆聽... 請在停頓處稍作停頓</p>
    </div>

    <!-- 操作按鈕 -->
    <div class="controls">
      <button class="btn-audio" @click="speak(targetSentence.replace(/\|/g, ''))">🔊 聽標準發音</button>
      
      <button 
        v-if="!isRecording" 
        class="btn-mic" 
        @click="startRecording"
        :disabled="!isSupported"
      >
        🎤 開始錄音
      </button>

      <button 
        v-if="isRecording" 
        class="btn-mic recording" 
        @click="stopRecording"
      >
        ⏹️ 停止錄音並辨識
      </button>

      <button v-if="hasRecording && !isRecording" class="btn-playback" @click="playRecording">
        ▶️ 播放我的錄音
      </button>
    </div>

    <!-- 診斷對照面板 -->
    <div v-if="hasRecording" class="result-panel">
      <div class="comparison">
        <p><strong>目標：</strong> {{ targetSentence.replace(/\|/g, '') }}</p>
        <p><strong>辨識：</strong> <span :class="isMatch ? 'text-success' : 'text-error'">{{ transcript || '(未辨識出聲音)' }}</span></p>
      </div>
      <p v-if="isMatch" class="feedback success">✅ 太棒了！你的發音很清晰，節奏也很好。</p>
      <p v-else class="feedback error">⚠️ 系統辨識有些落差，請點擊「播放我的錄音」，聽聽看哪裡需要調整，或請老師協助。</p>
    </div>
  </div>
</template>

<style scoped>
.analyzer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  gap: 16px;
}

/* 句子顯示區：加上 gap 避免文字黏在一起 */
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

.waveform-box {
  width: 100%;
  background: #fdfdfd;
  border: 2px dashed #e5e5e5;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s;
}

.waveform-box.is-recording {
  border-color: #1cb0f6;
  background: #e6f7ff;
}

canvas {
  width: 100%;
  height: 60px;
  border-radius: 8px;
  background: #f9f9f9;
}

.wave-hint {
  color: #999;
  font-size: 0.85rem;
  margin-top: 8px;
  margin-bottom: 0;
}

.wave-hint.recording {
  color: #1cb0f6;
  font-weight: bold;
  animation: pulse 1.5s infinite;
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

.btn-audio { background: #e6f7ff; color: #1cb0f6; border: 2px solid #1cb0f6; }
.btn-mic { background: #1cb0f6; color: white; border-bottom: 4px solid #1899d6; }
.btn-mic.recording { background: #ff4b4b; border-bottom-color: #cc0000; }
.btn-playback { background: #58cc02; color: white; border-bottom: 4px solid #46a302; }
button:active { border-bottom-width: 0; transform: translateY(4px); }

.result-panel {
  width: 100%;
  background: white;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
  text-align: left;
}

.comparison p { margin: 4px 0; font-size: 1rem; }
.text-success { color: #58cc02; font-weight: bold; }
.text-error { color: #ff4b4b; font-weight: bold; }

.feedback { margin-top: 12px; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 0.95rem; }
.feedback.success { background: #f0fff0; color: #58cc02; }
.feedback.error { background: #ffe6e6; color: #ea2b2b; }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>