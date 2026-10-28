// 使用模組級變數，確保全局只有一個 AudioContext
let audioCtx: AudioContext | null = null;

// 初始化並取得 AudioContext
const getAudioContext = () => {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    return audioCtx;
};

// 👈 新增：解鎖 Web Audio API
export const unlockAudioContext = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
            console.log('🔓 Web Audio API unlocked');
        }).catch(e => console.warn('Audio unlock failed', e));
    }
};

// 核心播放函式
const playTone = async (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine', volume = 0.2) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch (e) {
            console.warn('音效被瀏覽器阻擋，需使用者互動才能播放');
            return;
        }
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
};

export function useSound() {
    // 🎵 過關音效
    const playSuccess = async () => {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') await ctx.resume();

        const now = ctx.currentTime + 0.05;
        const notes = [523.25, 659.25, 783.99, 1046.50];

        notes.forEach((freq, index) => {
            playTone(freq, now + index * 0.1, 0.4, 'sine', 0.2);
        });
    };

    // ❌ 錯誤音效
    const playError = async () => {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') await ctx.resume();

        const now = ctx.currentTime + 0.05;
        playTone(392.00, now, 0.15, 'triangle', 0.15);
        playTone(311.13, now + 0.15, 0.3, 'triangle', 0.15);
    };

    return { playSuccess, playError };
}