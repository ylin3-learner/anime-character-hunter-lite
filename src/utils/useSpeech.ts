import { ref } from 'vue';

// ── 1. TTS 文字轉語音 ──
export function useTTS() {
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('瀏覽器不支援 TTS');
      return;
    }
    // 停止目前正在唸的語音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // 設定為美式英文
    utterance.rate = 0.9;     // 語速稍微放慢，適合教學
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  return { speak };
}

// ── 2. 語音辨識 (STT) ──
export function useSpeechRecognition() {
  const isListening = ref(false);
  const transcript = ref('');
  const isSupported = ref(false);
  const error = ref('');

  let recognition: any = null;

  // 初始化 (相容於 Chrome/Edge)
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    isSupported.value = true;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false; // 等講完才給結果
  }

  const startListening = (targetText: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!recognition) {
        error.value = '您的瀏覽器不支援語音辨識';
        resolve(false);
        return;
      }

      transcript.value = '';
      error.value = '';
      isListening.value = true;

      recognition.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        transcript.value = resultText;
        isListening.value = false;

        // 簡單的比對演算法：去掉標點符號、轉小寫、比對是否包含關鍵字
        const cleanTarget = targetText.toLowerCase().replace(/[.,?!]/g, '');
        const cleanResult = resultText.toLowerCase().replace(/[.,?!]/g, '');
        
        // 使用包含比對（因為語音辨識有時會多辨識出無意義的詞）
        const isMatch = cleanResult.includes(cleanTarget) || cleanTarget.includes(cleanResult);
        resolve(isMatch);
      };

      recognition.onerror = (event: any) => {
        error.value = '語音辨識發生錯誤，請確認麥克風權限。';
        isListening.value = false;
        resolve(false);
      };

      recognition.onend = () => {
        isListening.value = false;
      };

      recognition.start();
    });
  };

  return { isListening, transcript, isSupported, error, startListening };
}