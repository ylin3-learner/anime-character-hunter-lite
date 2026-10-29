import { ref } from 'vue';

let isTTSUnlocked = false;
let globalVoices: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;

// 👈 定義 Deepgram Aura-2 的高品質語音池
const DEEPGRAM_VOICES = [
  'aura-2-thalia-en',    // 女聲，清晰活潑
  'aura-2-arcas-en',     // 男聲，自然流暢
  'aura-2-helena-en',    // 女聲，親切溫柔
  'aura-2-apollo-en'     // 男聲，自信沉穩
];

const loadVoices = () => {
  if ('speechSynthesis' in window) {
    globalVoices = window.speechSynthesis.getVoices();
  }
};

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export const unlockTTS = () => {
  if (isTTSUnlocked) return;
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  }
  isTTSUnlocked = true;
};

export function useTTS() {
  const isSpeaking = ref(false);

  const speak = async (text: string, options?: { rate?: number }) => {
    const rate = options?.rate ?? 0.8;

    // 👈 檢查網址是否帶有 forceTTS=1 或 forceEdge=1 (兩者皆可)
    const forceCloudTTS = window.location.search.includes('forceTTS=1') || window.location.search.includes('forceEdge=1');
    const enVoices = globalVoices.filter(v => v.lang.toLowerCase().includes('en'));

    if (enVoices.length > 0 && !forceCloudTTS) {
      // 👈 情況 A：系統原生 TTS (平板/一般電腦)
      console.log('[TTS] 使用系統原生語音');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;

      const randomVoice = enVoices[Math.floor(Math.random() * enVoices.length)];
      utterance.voice = randomVoice;

      utterance.onstart = () => { isSpeaking.value = true; };
      utterance.onend = () => { isSpeaking.value = false; };
      window.speechSynthesis.speak(utterance);
    } else {
      // 👈 情況 B：Deepgram 雲端 TTS (智慧白板 或 強制測試)
      if (forceCloudTTS) {
        console.log('[TTS] 🚨 網址帶有強制參數，無視原生語音，強制走 Deepgram TTS...');
      } else {
        console.log('[TTS] 系統無語音包，呼叫 Deepgram TTS...');
      }

      isSpeaking.value = true;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const randomVoice = DEEPGRAM_VOICES[Math.floor(Math.random() * DEEPGRAM_VOICES.length)];

        // Deepgram 的 speed 限制為 0.7 ~ 1.5
        const deepgramSpeed = Math.max(0.7, Math.min(1.5, rate));

        console.log(`[TTS] 語音: ${randomVoice}, 原始語速: ${rate}, 實際傳送語速: ${deepgramSpeed}`);

        const res = await fetch(`${supabaseUrl}/functions/v1/deepgram-tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: randomVoice,
            speed: deepgramSpeed
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        // 👈 關鍵：接收二進位音訊，轉成 Blob 播放
        const audioBuffer = await res.arrayBuffer();
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);

        if (currentAudio) currentAudio.pause();
        currentAudio = new Audio(audioUrl);

        // 雖然後端已經處理了變速，這裡再設一次作為雙重保險
        currentAudio.playbackRate = 1.0;

        currentAudio.onended = () => {
          isSpeaking.value = false;
          URL.revokeObjectURL(audioUrl); // 釋放記憶體
        };
        currentAudio.onerror = () => {
          isSpeaking.value = false;
          console.error('[TTS] 音檔播放失敗');
        };

        await currentAudio.play();
        console.log('[TTS] Deepgram TTS 播放成功');

      } catch (error: any) {
        console.error(`[TTS] Deepgram TTS 失敗: ${error.message || error}`);
        isSpeaking.value = false;
      }
    }
  };

  return { speak, isSpeaking };
}

// ... 保留原本的 useSpeechRecognition (略，請貼上你原本的即可) ...
export function useSpeechRecognition() {
  const isListening = ref(false);
  const transcript = ref('');
  const isSupported = ref(false);
  const error = ref('');
  let recognition: any = null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (SpeechRecognition) {
    isSupported.value = true;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
  }

  const startListening = (targetText: string): Promise<{ match: boolean; text: string }> => {
    return new Promise((resolve) => {
      if (!recognition) { resolve({ match: false, text: '瀏覽器不支援' }); return; }
      transcript.value = ''; error.value = ''; isListening.value = true;
      recognition.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        transcript.value = resultText; isListening.value = false;
        const cleanTarget = targetText.toLowerCase().replace(/[.,?!|]/g, '').split(/\s+/).filter(Boolean);
        const cleanResult = resultText.toLowerCase().replace(/[.,?!|]/g, '').split(/\s+/).filter(Boolean);
        let matchCount = 0;
        cleanTarget.forEach((word: string) => { if (cleanResult.includes(word)) matchCount++; });
        resolve({ match: (matchCount / cleanTarget.length) >= 0.7, text: resultText });
      };
      recognition.onerror = (event: any) => {
        isListening.value = false; resolve({ match: false, text: `[錯誤: ${event.error}]` });
      };
      recognition.onend = () => { isListening.value = false; };
      try { recognition.start(); } catch (e: any) { resolve({ match: false, text: `[啟動失敗]` }); }
    });
  };
  return { isListening, transcript, isSupported, error, startListening };
}