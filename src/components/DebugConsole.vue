<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isOpen = ref(false);
const logs = ref<{ type: string; text: string; time: string }[]>([]);

const getTime = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

const formatArgs = (args: any[]) => {
    return args.map(arg => {
        if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
        }
        return String(arg);
    }).join(' ');
};

onMounted(() => {
    console.log = (...args) => {
        logs.value.push({ type: 'log', text: formatArgs(args), time: getTime() });
        originalLog.apply(console, args);
    };
    console.warn = (...args) => {
        logs.value.push({ type: 'warn', text: formatArgs(args), time: getTime() });
        originalWarn.apply(console, args);
    };
    console.error = (...args) => {
        logs.value.push({ type: 'error', text: formatArgs(args), time: getTime() });
        originalError.apply(console, args);
    };
});

onUnmounted(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
});

const clearLogs = () => { logs.value = []; };
</script>

<template>
    <button class="debug-btn" @click="isOpen = !isOpen">⚙️</button>

    <div v-if="isOpen" class="debug-panel">
        <div class="debug-header">
            <span>🛠️ 開發者主控台</span>
            <div class="actions">
                <button @click="clearLogs">🗑️ 清空</button>
                <button @click="isOpen = false">✖ 關閉</button>
            </div>
        </div>
        <div class="debug-body">
            <div v-if="logs.length === 0" class="empty">目前沒有日誌</div>
            <div v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
                <span class="time">[{{ log.time }}]</span>
                <pre class="text">{{ log.text }}</pre>
            </div>
        </div>
    </div>
</template>

<style scoped>
.debug-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #333;
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.debug-panel {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 90vw;
    max-width: 500px;
    height: 60vh;
    background: #1e1e1e;
    color: #d4d4d4;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    z-index: 999999;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    font-family: monospace;
    border: 1px solid #444;
}

.debug-header {
    padding: 10px 16px;
    background: #333;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
}

.debug-header .actions button {
    background: #555;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 8px;
}

.debug-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    font-size: 0.85rem;
}

.empty {
    text-align: center;
    color: #777;
    margin-top: 20px;
}

.log-item {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
    word-break: break-all;
}

.log-item.error {
    color: #ff6b6b;
}

.log-item.warn {
    color: #feca57;
}

.log-item.log {
    color: #48dbfb;
}

.time {
    color: #888;
    margin-right: 8px;
}

pre.text {
    margin: 4px 0 0 0;
    white-space: pre-wrap;
    font-family: monospace;
}
</style>