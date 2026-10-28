import { ref } from 'vue';

let isTTSUnlocked = false;
let globalVoices: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;

const edgeVoices = [
  'en-US-AriaNeural', 'en-US-GuyNeural', 'en-US-JennyNeural', 'en-US-ChristopherNeural'
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
      console.log(`[TTS] 走本機原生語音 (可用語音數: ${enVoices.length})`);
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
      console.log('[TTS] 無本機語音，呼叫 Supabase Edge TTS...');
      isSpeaking.value = true;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const randomEdgeVoice = edgeVoices[Math.floor(Math.random() * edgeVoices.length)];
        console.log(`[TTS] 隨機語音: ${randomEdgeVoice}, 語速: ${rate}`);

        const res = await fetch(`${supabaseUrl}/functions/v1/edge-tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, rate: rate.toString(), voice: randomEdgeVoice })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();

        if (data.url) {
          if (currentAudio) currentAudio.pause();
          currentAudio = new Audio(data.url);
          currentAudio.playbackRate = rate;
          currentAudio.onended = () => { isSpeaking.value = false; };
          currentAudio.onerror = () => { isSpeaking.value = false; console.error('[TTS] 音檔播放失敗'); };
          await currentAudio.play();
          console.log('[TTS] 播放成功');
        } else {
          throw new Error(data.error || '取得音檔失敗 (無 URL)');
        }
      } catch (error: any) {
        console.error(`[TTS] Edge TTS 失敗: ${error.message || error}`);
        isSpeaking.value = false;
      }
    }
  };

  return { speak, isSpeaking };
}

// useSpeechRecognition 保持不變
export function useSpeechRecognition() {
  // ... (略，請保留你原本的程式碼)
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