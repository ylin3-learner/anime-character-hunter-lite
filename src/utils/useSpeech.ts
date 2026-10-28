import { ref } from 'vue';

let isTTSUnlocked = false;

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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = options?.rate ?? 0.8;
      utterance.pitch = options?.pitch ?? 1;
      utterance.onstart = () => { isSpeaking.value = true; };
      utterance.onend = () => { isSpeaking.value = false; };
      utterance.onerror = () => { isSpeaking.value = false; };
      window.speechSynthesis.speak(utterance);
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

      // 👈 修改：把具體錯誤印出來，並 resolve 帶有錯誤字串的結果
      recognition.onerror = (event: any) => {
        console.error('🚨 語音辨識發生錯誤 (onerror):', event.error);
        isListening.value = false;
        resolve({ match: false, text: `[系統錯誤: ${event.error}]` });
      };

      recognition.onend = () => {
        isListening.value = false;
        // 如果 onresult 沒有觸發，onend 會先觸發，這裡給個安全防護
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