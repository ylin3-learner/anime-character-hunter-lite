<script setup lang="ts">
import { useTTS } from '../utils/useSpeech';

const props = defineProps<{
  audioText: string;
  options: { image: string; text: string; isCorrect: boolean }[];
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { speak } = useTTS();

const handleSelect = (isCorrect: boolean, index: number) => {
  if (isCorrect) {
    // 答對了，稍微停頓後進入下一階段
    setTimeout(() => {
      emit('success');
    }, 800);
  } else {
    // 答錯了，重新播放句子，並給予引導
    speak(props.audioText);
    alert('再聽一次！注意聽修飾語的部分，是哪一個女孩呢？');
  }
};
</script>

<template>
  <div class="structured-input">
    <h2 class="instruction">🎧 請聽句子，選出正確的圖片</h2>
    
    <button class="btn-play-audio" @click="speak(audioText)">
      🔊 播放句子
    </button>

    <div class="options-grid">
      <div 
        v-for="(opt, index) in options" 
        :key="index"
        class="option-card"
        @click="handleSelect(opt.isCorrect, index)"
      >
        <img :src="opt.image" alt="option" />
        <p>{{ opt.text }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.structured-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: fadeIn 0.5s ease;
}

.instruction {
  color: #777;
  font-size: 1.2rem;
  margin-bottom: 24px;
}

.btn-play-audio {
  background: #e6f7ff;
  color: #1cb0f6;
  border: 2px solid #1cb0f6;
  padding: 16px 32px;
  border-radius: 16px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 40px;
  transition: all 0.2s;
}
.btn-play-audio:hover { background: #1cb0f6; color: white; }

.options-grid {
  display: flex;
  gap: 20px;
  justify-content: center;
  width: 100%;
}

.option-card {
  background: white;
  border: 3px solid #e5e5e5;
  border-radius: 20px;
  padding: 20px;
  width: 200px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.option-card:hover {
  border-color: #1cb0f6;
  transform: translateY(-4px);
}

.option-card img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 12px;
}

.option-card p {
  font-weight: bold;
  color: #333;
  margin: 0;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>