<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTTS } from '../utils/useSpeech';

const props = defineProps<{
    image: string;
    noun: string;
    chunk: string;
    zhMeaning: string;
    quizOptions?: { text: string; isCorrect: boolean }[]; // 👈 改為選填
}>();

const emit = defineEmits<{
    (e: 'success'): void;
}>();

const { speak } = useTTS();

const cleanChunk = props.chunk.replace(/[\[\]]/g, '');
const selectedIndex = ref<number | null>(null);
const isWrong = ref(false);
const isSuccess = ref(false);

const playChunkAudio = () => {
    speak(cleanChunk);
};

const handleSelect = (opt: { text: string; isCorrect: boolean }, index: number) => {
    if (isSuccess.value) return;
    selectedIndex.value = index;

    if (opt.isCorrect) {
        isSuccess.value = true;
        speak(cleanChunk);
        setTimeout(() => {
            emit('success');
        }, 1500);
    } else {
        isWrong.value = true;
        setTimeout(() => {
            isWrong.value = false;
            selectedIndex.value = null;
        }, 800);
    }
};
</script>

<template>
    <div class="chunk-preview">
        <h2>🔍 片語預習與測驗</h2>
        <p class="instruction" v-if="quizOptions?.length">請觀察圖片，選出正確的英文片語！</p>
        <p class="instruction" v-else>請點擊片語聽發音，並記住它的意思！</p>

        <div class="character-card">
            <img :src="image" alt="character" class="preview-img" />
            <div class="text-area">
                <div class="noun-text">{{ noun }}</div>

                <div class="audio-hint" @click="playChunkAudio">
                    🔊 點我聽發音提示
                </div>

                <div class="zh-text">{{ zhMeaning }}</div>
            </div>
        </div>

        <!-- 如果有設定 quizOptions 則顯示測驗按鈕，否則顯示原本的繼續按鈕 -->
        <div v-if="quizOptions && quizOptions.length > 0" class="quiz-options">
            <button v-for="(opt, index) in quizOptions" :key="index" class="quiz-btn" :class="{
                'is-wrong': isWrong && selectedIndex === index,
                'is-success': isSuccess && selectedIndex === index
            }" @click="handleSelect(opt, index)">
                {{ opt.text }}
            </button>
        </div>

        <button v-else class="btn-next" @click="emit('success')">
            我記住了，開始挑戰 ➔
        </button>
    </div>
</template>

<style scoped>
.chunk-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: fadeIn 0.5s ease;
}

h2 {
    color: #1cb0f6;
    margin-bottom: 8px;
}

.instruction {
    color: #777;
    margin-bottom: 32px;
}

.character-card {
    background: white;
    border: 3px solid #e5e5e5;
    border-radius: 24px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    margin-bottom: 32px;
    width: 320px;
}

.preview-img {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 20px;
    background: #f0f0f0;
    border: 4px solid #1cb0f6;
}

.text-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.noun-text {
    font-size: 1.5rem;
    font-weight: 800;
    color: #333;
}

.audio-hint {
    font-size: 0.9rem;
    color: #1cb0f6;
    cursor: pointer;
    text-decoration: underline;
    font-weight: bold;
}

.audio-hint:hover {
    color: #1899d6;
}

.zh-text {
    color: #ff9800;
    font-weight: bold;
    font-size: 1.1rem;
    background: #fff3e0;
    padding: 4px 12px;
    border-radius: 8px;
}

.quiz-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 400px;
}

.quiz-btn {
    background: #ffffff;
    border: 2px solid #e5e5e5;
    border-bottom-width: 4px;
    padding: 16px;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: bold;
    color: #4b4b4b;
    cursor: pointer;
    transition: all 0.1s;
}

.quiz-btn:hover {
    background: #f7f7f7;
}

.quiz-btn:active {
    border-bottom-width: 2px;
    transform: translateY(2px);
}

.quiz-btn.is-wrong {
    background: #ffdfe0;
    border-color: #ff4b4b;
    color: #ea2b2b;
    animation: shake 0.4s;
}

.quiz-btn.is-success {
    background: #d7ffb8;
    border-color: #58cc02;
    color: #58cc02;
}

.btn-next {
    background: #58cc02;
    color: white;
    border: none;
    border-bottom: 4px solid #46a302;
    padding: 16px 48px;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.1s;
}

.btn-next:active {
    border-bottom-width: 0;
    transform: translateY(4px);
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes shake {

    10%,
    90% {
        transform: translate3d(-2px, 0, 0);
    }

    20%,
    80% {
        transform: translate3d(4px, 0, 0);
    }

    30%,
    50%,
    70% {
        transform: translate3d(-8px, 0, 0);
    }

    40%,
    60% {
        transform: translate3d(8px, 0, 0);
    }
}
</style>