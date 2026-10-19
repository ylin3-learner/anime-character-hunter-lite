<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CloudDatabase, type LearningLog } from '../services/CloudDatabase';

const emit = defineEmits<{ (e: 'close'): void }>();

const logs = ref<LearningLog[]>([]);
const isLoading = ref(true);
const isClearing = ref(false);

// 抓取資料的函式
const loadData = async () => {
    isLoading.value = true;
    logs.value = await CloudDatabase.fetchLogs();
    isLoading.value = false;
};

// 初始化載入
onMounted(() => {
    loadData();
});

// 清空紀錄邏輯
const handleClearLogs = async () => {
    const confirmed = confirm('確定要清空所有學生的作答紀錄嗎？此操作無法復原喔！');
    if (!confirmed) return;

    isClearing.value = true;
    const success = await CloudDatabase.clearAllLogs();

    if (success) {
        alert('✅ 已成功清空所有紀錄！');
        await loadData(); // 重新載入資料以更新畫面
    } else {
        alert('❌ 清空失敗，請確認網路連線。');
    }
    isClearing.value = false;
};

// 統計各種錯誤代碼的次數
const stats = computed(() => {
    const counts: Record<string, number> = {};
    logs.value.forEach(log => {
        if (log.error_code) {
            counts[log.error_code] = (counts[log.error_code] || 0) + 1;
        }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(counts)
        .map(([code, count]) => ({
            code,
            count,
            percentage: total === 0 ? 0 : (count / total) * 100
        }))
        .sort((a, b) => b.count - a.count);

    const nameDict: Record<string, string> = {
        'DUPLICATE_PRONOUN': '重複代名詞 (例：who she)',
        'SV_AGREEMENT': '主謂不一致 (例：who wear)',
        'WRONG_ORDER': '字序錯誤',
        'PUZZLE_ERROR': '拼圖方向/位置錯誤',
        'SUCCESS': '成功過關'
    };

    return sorted.map(item => ({
        ...item,
        name: nameDict[item.code] || item.code
    }));
});
</script>

<template>
    <div class="analytics-overlay">
        <div class="analytics-card">
            <div class="header">
                <h2>📊 全班學習軌跡分析</h2>
                <div class="header-actions">
                    <!-- 👇 加上確認是否有成功定義樣式 -->
                    <button class="btn-clear" @click="handleClearLogs" :disabled="isClearing || logs.length === 0">
                        {{ isClearing ? '清空中...' : '🗑️ 清空紀錄' }}
                    </button>
                    <button class="btn-close" @click="emit('close')">✕</button>
                </div>
            </div>

            <div v-if="isLoading" class="loading">正在載入數據...</div>

            <div v-else-if="logs.length === 0" class="empty">
                目前尚無數據。請讓學生開始遊玩以收集軌跡。
            </div>

            <div v-else class="stats-container">
                <p class="subtitle">總計收集 {{ logs.length }} 筆學習紀錄</p>

                <div class="chart">
                    <div v-for="item in stats" :key="item.code" class="chart-row">
                        <div class="label">{{ item.name }} ({{ item.count }} 次)</div>
                        <div class="bar-bg">
                            <div class="bar-fill" :style="{ width: `${item.percentage}%` }"></div>
                        </div>
                        <div class="percentage">{{ Math.round(item.percentage) }}%</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 原有樣式保持不變，新增 header-actions 與 btn-clear 樣式 */
.analytics-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.analytics-card {
    background: white;
    width: 90vw;
    max-width: 600px;
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
    animation: popIn 0.3s ease;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #eee;
    padding-bottom: 16px;
}

.header h2 {
    margin: 0;
    color: #1cb0f6;
    font-size: 1.5rem;
}

/* 👇 修正：補齊按鈕群組樣式 */
.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* 👇 修正：補齊清空按鈕的樣式（紅色警告色） */
.btn-clear {
    background: #ffdfe0;
    color: #ff4b4b;
    border: 2px solid #ff4b4b;
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: bold;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-clear:hover:not(:disabled) {
    background: #ff4b4b;
    color: white;
}

.btn-clear:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: #ccc;
    background: #f0f0f0;
    color: #999;
}

.btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #999;
}

.btn-close:hover {
    color: #ff4b4b;
}

.loading,
.empty {
    text-align: center;
    color: #777;
    padding: 40px 0;
    font-size: 1.1rem;
}

.subtitle {
    color: #777;
    margin-bottom: 24px;
    font-weight: bold;
}

/* 圖表樣式 */
.chart {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.chart-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.label {
    width: 200px;
    font-size: 0.95rem;
    font-weight: bold;
    color: #333;
    text-align: right;
}

.bar-bg {
    flex: 1;
    height: 24px;
    background: #f0f0f0;
    border-radius: 12px;
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #1cb0f6, #58cc02);
    border-radius: 12px;
    transition: width 1s ease-out;
}

.percentage {
    width: 50px;
    font-weight: bold;
    color: #1cb0f6;
    text-align: left;
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
</style>