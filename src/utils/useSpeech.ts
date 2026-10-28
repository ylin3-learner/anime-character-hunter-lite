import { ref } from 'vue';

let isTTSUnlocked = false;
let globalVoices: SpeechSynthesisVoice[] = [];

// 👈 新增：載入並監聽語音包
const loadVoices = () => {
  if ('speechSynthesis' in window) {
    globalVoices = window.speechSynthesis.getVoices();
    if (globalVoices.length > 0) {
      console.log(`✅ TTS 語音包已載入，共 ${globalVoices.length} 個`);
    }
  }
};

// 初始化時立刻嘗試載入，並綁定變化事件（解決非同步載入問題）
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export const unlockTTS = () => {
  if (isTTSUnlocked || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(' ');
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
  isTTSUnlocked = true;
};

export function useTTS() {
  const isSpeaking = ref(false);
  
  const speak = (text: string, options?: { rate?: number; pitch?: number }) => {
    if (!('speechSynthesis' in window)) {
      console.warn('❌ 此瀏覽器不支援 TTS');
      return;
    }

    window.speechSynthesis.cancel();

    // 如果陣列是空的，再抓一次
    if (globalVoices.length === 0) loadVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = options?.rate ?? 0.8;
    utterance.pitch = options?.pitch ?? 1;

    // 👈 核心修正：強制匹配英文語音包
    // 如果系統預設是中文，不指定 voice 會導致靜音。
    const enVoice = globalVoices.find(v => v.lang.toLowerCase().includes('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    } else {
      console.warn('⚠️ 找不到英文語音包，嘗試使用系統預設...');
    }

    utterance.onstart = () => { 
      console.log('🔊 TTS 開始播放');
      isSpeaking.value = true; 
    };
    utterance.onend = () => { 
      isSpeaking.value = false; 
    };
    utterance.onerror = (e) => { 
      console.error('🚨 TTS 發生錯誤:', e.error);
      isSpeaking.value = false; 
    };

    window.speechSynthesis.speak(utterance);
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