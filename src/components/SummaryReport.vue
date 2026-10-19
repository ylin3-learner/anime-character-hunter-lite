<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  completedLevels: number;
  totalLevels: number;
  misconceptions: string[];
}>();

const emit = defineEmits<{
  (e: 'restart'): void;
}>();

const misconceptionText = computed(() => {
  const dict: Record<string, string> = {
    'DUPLICATE_PRONOUN': '重複代名詞 (例如：who she)',
    'SV_AGREEMENT': '主詞動詞不一致 (例如：who wear)'
  };
  return props.misconceptions.map(m => dict[m] || m);
});
</script>

<template>
  <div class="summary-overlay">
    <div class="summary-card">
      <!-- 適合截圖的頂部標題 -->
      <div class="header">
        <div class="badge">🕵️ 英語文法小偵探</div>
        <h2>任務完成！</h2>
        <p>恭喜你完成了 {{ completedLevels }} / {{ totalLevels }} 個關卡。</p>
      </div>

      <!-- 學習軌跡紀錄 -->
      <div class="stats-section">
        <h3>🔍 我的學習軌跡</h3>
        <ul v-if="misconceptionText.length > 0" class="misconception-list">
          <li v-for="(text, i) in misconceptionText" :key="i">
            <span class="icon">💡</span> 成功破解迷思：{{ text }}
          </li>
        </ul>
        <p v-else class="perfect-text">✨ 太完美了！沒有觸發任何文法迷思。</p>
      </div>

      <!-- 截圖提示區 -->
      <div class="screenshot-hint">
        <p>📸 請使用平板或電腦的「截圖功能」，將此畫面拍下並傳給老師！</p>
      </div>

      <!-- 動作按鈕 -->
      <div class="actions">
        <button class="btn-restart" @click="emit('restart')">
          🔄 重新開始練習
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.summary-card {
  background: white;
  width: 90vw;
  max-width: 480px;
  border-radius: 24px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 24px 48px rgba(0,0,0,0.3);
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 4px solid #58cc02; /* 綠色外框，截圖更好看 */
}

.header .badge {
  display: inline-block;
  background: #e6f7ff;
  color: #1cb0f6;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  margin-bottom: 12px;
}

.header h2 { color: #58cc02; font-size: 2.2rem; margin: 0 0 8px 0; }
.header p { color: #777; margin-bottom: 24px; font-size: 1.1rem; }

.stats-section {
  background: #f9f9f9;
  border-radius: 16px;
  padding: 24px;
  text-align: left;
  margin-bottom: 24px;
}
.stats-section h3 { margin: 0 0 16px 0; color: #333; font-size: 1.2rem; text-align: center;}

.misconception-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.misconception-list li {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  border-left: 4px solid #ff9800;
  color: #555;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.icon { margin-right: 8px; }
.perfect-text { color: #58cc02; font-weight: bold; margin: 0; text-align: center; font-size: 1.1rem;}

.screenshot-hint {
  background: #fff8e1;
  border: 2px dashed #ffc107;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  color: #e65100;
  font-weight: bold;
  font-size: 0.95rem;
  line-height: 1.5;
}

.actions { display: flex; flex-direction: column; gap: 12px; }

.btn-restart {
  background: #f0f0f0; color: #777; border: none; border-bottom: 4px solid #ccc;
  padding: 16px; border-radius: 16px; font-weight: bold; font-size: 1.1rem; cursor: pointer;
  transition: all 0.1s;
}
.btn-restart:active { border-bottom-width: 0; transform: translateY(4px); }

@keyframes popIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>