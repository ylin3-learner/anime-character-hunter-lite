import { ref } from 'vue';

let isTTSUnlocked = false;
let globalVoices: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;

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
    const hasSystemVoices = 'speechSynthesis' in window && globalVoices.length > 0;

    if (hasSystemVoices) {
      // 👈 情況 A：學生平板（有原生語音包）
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      
      const enVoice = globalVoices.find(v => v.lang.toLowerCase().includes('en'));
      if (enVoice) utterance.voice = enVoice;
      
      utterance.onstart = () => { isSpeaking.value = true; };
      utterance.onend = () => { isSpeaking.value = false; };
      window.speechSynthesis.speak(utterance);
    } else {
      // 👈 情況 B：智慧白板（無原生語音包，呼叫 Supabase）
      console.log('⚠️ 系統無語音包，呼叫 Supabase Edge TTS...');
      isSpeaking.value = true;
      
      try {
        // 自動抓取環境變數中的 Supabase URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        const res = await fetch(`${supabaseUrl}/functions/v1/edge-tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 若你的 Edge Function 有開啟 JWT 驗證，這裡需要加上 apikey 標頭
            // 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ text, rate: rate.toString() })
        });

        const data = await res.json();
        
        if (data.url) {
          if (currentAudio) currentAudio.pause();
          currentAudio = new Audio(data.url);
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

// 👈 保留原本的 STT 函數（目前 Sprint 1 先不用，但保留給 Sprint 2）
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