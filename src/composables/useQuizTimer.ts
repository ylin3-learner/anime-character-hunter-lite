import { ref, onUnmounted } from 'vue';

export function useQuizTimer(onTimeout: () => void) {
  const timeLeft = ref(0);
  const isTimeUp = ref(false);
  let endTime = 0;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  const clearTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    isTimeUp.value = false;
    timeLeft.value = 0;
    endTime = 0;
  };

  const updateTimeLeft = () => {
    const now = Date.now();
    const diff = endTime - now;
    if (diff <= 0) {
      timeLeft.value = 0;
      isTimeUp.value = true;
      clearTimer();
      onTimeout();
    } else {
      timeLeft.value = Math.ceil(diff / 1000);
    }
  };

  const startTimer = (seconds: number) => {
    clearTimer();
    endTime = Date.now() + seconds * 1000;
    updateTimeLeft(); // 立即更新一次 UI
    timerInterval = setInterval(updateTimeLeft, 1000);
  };

  const addTime = (seconds: number) => {
    if (isTimeUp.value || endTime === 0) return;
    endTime += seconds * 1000;
    updateTimeLeft();
  };

  onUnmounted(clearTimer);

  return { timeLeft, isTimeUp, startTimer, addTime, clearTimer };
}