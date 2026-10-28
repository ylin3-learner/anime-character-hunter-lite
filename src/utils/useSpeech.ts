import { ref } from 'vue';

let isTTSUnlocked = false;
let globalVoices: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;

const edgeVoices = [
  'en-US-AriaNeural',      // 女聲，活潑
  'en-US-GuyNeural',       // 男聲，沉穩
  'en-US-JennyNeural',     // 女聲，溫柔
  'en-US-ChristopherNeural'// 男聲，成熟
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

    const enVoices = globalVoices.filter(v => v.lang.toLowerCase().includes('en'));

    if (enVoices.length > 0) {
      // 情況 A：系統原生 TTS (平板)
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
      // 情況 B：Supabase Edge TTS (智慧白板)
      console.log('⚠️ 系統無語音包，呼叫 Supabase Edge TTS...');
      isSpeaking.value = true;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const randomEdgeVoice = edgeVoices[Math.floor(Math.random() * edgeVoices.length)];
        console.log(`🎲 隨機使用 Edge 語音: ${randomEdgeVoice}，語速: ${rate}`);

        const res = await fetch(`${supabaseUrl}/functions/v1/edge-tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            rate: rate.toString(),
            voice: randomEdgeVoice
          })
        });

        const data = await res.json();

        if (data.url) {
          if (currentAudio) currentAudio.pause();
          currentAudio = new Audio(data.url);

          // 👈 雙重保險：前端播放時也設定播放速度 (現代瀏覽器會做到不變調變速)
          currentAudio.playbackRate = rate;

          currentAudio.onended = () => { isSpeaking.value = false; };
          currentAudio.onerror = () => { isSpeaking.value = false; console.error('音檔播放失敗'); };
          await currentAudio.play();
        } else {
          throw new Error(data.error || '取得音檔失敗');
        }
      } catch (error) {
        console.error('❌ Edge TTS 失敗:', error);
        isSpeaking.value = false;
      }
    }
  };

  return { speak, isSpeaking };
}

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
      if (!recognition) {
        resolve({ match: false, text: '瀏覽器不支援' });
        return;
      }
      transcript.value = '';
      error.value = '';
      isListening.value = true;

      recognition.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        transcript.value = resultText;
        isListening.value = false;
        const cleanTarget = targetText.toLowerCase().replace(/[.,?!|]/g, '').split(/\s+/).filter(Boolean);
        const cleanResult = resultText.toLowerCase().replace(/[.,?!|]/g, '').split(/\s+/).filter(Boolean);
        let matchCount = 0;
        cleanTarget.forEach((word: string) => {
          if (cleanResult.includes(word)) matchCount++;
        });
        const match = (matchCount / cleanTarget.length) >= 0.7;
        resolve({ match, text: resultText });
      };

      recognition.onerror = (event: any) => {
        console.error('🚨 語音辨識發生錯誤 (onerror):', event.error);
        isListening.value = false;
        resolve({ match: false, text: `[系統錯誤: ${event.error}]` });
      };

      recognition.onend = () => {
        isListening.value = false;
        if (isListening.value) {
          resolve({ match: false, text: '[未收到語音]' });
        }
      };

      try {
        recognition.start();
      } catch (e: any) {
        console.error('🚨 無法啟動:', e);
        resolve({ match: false, text: `[啟動失敗: ${e.message}]` });
      }
    });
  };

  return { isListening, transcript, isSupported, error, startListening };
}