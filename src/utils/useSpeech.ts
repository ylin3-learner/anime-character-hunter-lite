import { ref } from 'vue';

// ── 1. TTS 文字轉語音 ──
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

// ── 2. 語音辨識 (STT) ──
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
        error.value = '您的瀏覽器不支援語音辨識';
        resolve({ match: false, text: '' });
        return;
      }

      transcript.value = '';
      error.value = '';
      isListening.value = true;

      recognition.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        transcript.value = resultText;
        isListening.value = false;

        // 更嚴謹的比對：去標點、轉小寫、分詞比對
        const cleanTarget = targetText.toLowerCase().replace(/[.,?!|]/g, '').split(/\s+/).filter(Boolean);
        const cleanResult = resultText.toLowerCase().replace(/[.,?!|]/g, '').split(/\s+/).filter(Boolean);
        
        // 計算目標詞彙被辨識出的比例
        let matchCount = 0;
        cleanTarget.forEach((word: string) => {
          if (cleanResult.includes(word)) matchCount++;
        });
        
        // 如果命中率超過 70%，就視為通過
        const match = (matchCount / cleanTarget.length) >= 0.7;
        resolve({ match, text: resultText });
      };

      recognition.onerror = () => {
        error.value = '語音辨識發生錯誤，請確認麥克風權限。';
        isListening.value = false;
        resolve({ match: false, text: '' });
      };

      recognition.onend = () => {
        isListening.value = false;
      };

      recognition.start();
    });
  };

  return { isListening, transcript, isSupported, error, startListening };
}