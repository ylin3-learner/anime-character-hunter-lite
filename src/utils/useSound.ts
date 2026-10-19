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

// 核心播放函式 (改為 async，確保先 resume 再發聲)
const playTone = async (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine', volume = 0.2) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 加入 try...catch，防止被瀏覽器安全機制阻擋時報錯
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

    // 音量包絡，避免爆音
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
};

export function useSound() {
    // 🎵 過關音效：C5 - E5 - G5 - C6 (清脆的上升琶音)
    const playSuccess = async () => {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') await ctx.resume();

        // 以「現在」為基準時間
        const now = ctx.currentTime + 0.05;
        const notes = [523.25, 659.25, 783.99, 1046.50];

        notes.forEach((freq, index) => {
            playTone(freq, now + index * 0.1, 0.4, 'sine', 0.2);
        });
    };

    // ❌ 錯誤音效：G4 -> Eb4 (低沉的下降雙音)
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