import { ref } from 'vue';

let isTTSUnlocked = false;
let globalVoices: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;

// 👈 定義公認高品質的語音包關鍵字 (跨平台：iOS, macOS, Windows, Chrome)
const HIGH_QUALITY_VOICES = [
  // Apple (iOS / macOS) - Siri 等級的高品質語音
  'Samantha', 'Alex', 'Daniel', 'Karen', 'Moira', 'Tessa', 'Rishi',
  // Google (Chrome) - Google 的神經網路語音
  'Google US English', 'Google UK English',
  // Microsoft (Edge / Windows 11 自然語音)
  'Aria', 'Guy', 'Jenny', 'Christopher', 'Natural'
];

// 用來過濾低品質、機械音的關鍵字 (例如舊版的 Zira, David 等)
const BAD_VOICE_KEYWORDS = ['compact', 'robot', 'Zira', 'David', 'Mark'];

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
    const forceEdge = window.location.search.includes('forceEdge=1');

    // 1. 取得所有英文語音包
    const enVoices = globalVoices.filter(v => v.lang.toLowerCase().includes('en'));

    // 2. 👈 過濾出「高品質」的語音包
    let premiumVoices = enVoices.filter(voice => {
      const name = voice.name;
      // 必須符合白名單關鍵字，且不能包含黑名單的爛語音關鍵字
      const isHighQuality = HIGH_QUALITY_VOICES.some(keyword => name.includes(keyword));
      const isBadQuality = BAD_VOICE_KEYWORDS.some(keyword => name.includes(keyword));
      return isHighQuality && !isBadQuality;
    });

    // 如果過濾後為空，就退而求其次用所有的英文語音包
    if (premiumVoices.length === 0) {
      premiumVoices = enVoices;
    }

    // 3. 判斷走原生還是強制走雲端 (除錯用)
    if (premiumVoices.length > 0 && !forceEdge) {
      // 👈 情況 A：走本機原生高品質語音 (平板/電腦)
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;

      // 隨機挑選一個高品質語音包
      const randomVoice = premiumVoices[Math.floor(Math.random() * premiumVoices.length)];
      utterance.voice = randomVoice;

      console.log(`[TTS] 使用原生高品質語音: ${randomVoice.name}`);

      utterance.onstart = () => { isSpeaking.value = true; };
      utterance.onend = () => { isSpeaking.value = false; };
      window.speechSynthesis.speak(utterance);
    } else {
      // 情況 B：強制走 Edge/Azure TTS 代理 (測試用)
      console.log('[TTS] 呼叫雲端 TTS 代理...');
      isSpeaking.value = true;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        // 雲端代理的語音池 (直接指定微軟的高品質神經網路語音)
        const edgeVoices = [
          'en-US-AriaNeural', 'en-US-GuyNeural', 'en-US-JennyNeural', 'en-US-ChristopherNeural'
        ];
        const randomEdgeVoice = edgeVoices[Math.floor(Math.random() * edgeVoices.length)];

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
        } else {
          throw new Error(data.error || '取得音檔失敗 (無 URL)');
        }
      } catch (error: any) {
        console.error(`[TTS] 雲端 TTS 失敗: ${error.message || error}`);
        isSpeaking.value = false;
      }
    }
  };

  return { speak, isSpeaking };
}

// (保留原本的 useSpeechRecognition 邏輯)
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