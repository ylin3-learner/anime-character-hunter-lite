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
    // 🎵 過關音效 (保持不變)
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

    // ❌ 錯誤音效 (保持不變)
    const playError = async () => {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') await ctx.resume();

        const now = ctx.currentTime + 0.05;
        playTone(392.00, now, 0.15, 'triangle', 0.15);
        playTone(311.13, now + 0.15, 0.3, 'triangle', 0.15);
    };

    // 🚨 防切屏警告音 (短促尖銳的逼逼逼)
    const playWarningBeep = async () => {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') await ctx.resume();

        const now = ctx.currentTime;

        // 自訂一個專門產生極短促警報聲的函數
        const playBeep = (startTime: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square'; // 👈 方波，電子音、警告感最強
            osc.frequency.setValueAtTime(1200, startTime); // 👈 1200Hz 高頻

            // 快起快落，避免破音，但保持短促
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01); // 0.01秒內拉到最大聲
            gain.gain.setValueAtTime(0.15, startTime + 0.07); // 維持 0.07 秒
            gain.gain.linearRampToValueAtTime(0, startTime + 0.08); // 0.08秒瞬間收尾

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.08);
        };

        // 👈 連續三聲短促的「逼！逼！逼！」
        // 第一聲：現在
        playBeep(now);
        // 第二聲：間隔 0.15 秒
        playBeep(now + 0.15);
        // 第三聲：再間隔 0.15 秒
        playBeep(now + 0.30);
    };

    return { playSuccess, playError, playWarningBeep };
}