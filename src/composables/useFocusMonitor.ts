import { onMounted, onUnmounted } from 'vue';

export function useFocusMonitor(onDistracted: () => void) {
  let blurTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleVisibilityChange = () => {
    if (document.hidden) {
      onDistracted();
    }
  };

  const handleWindowBlur = () => {
    blurTimeout = setTimeout(() => {
      if (!document.hidden) onDistracted();
    }, 200);
  };

  const handleWindowFocus = () => {
    if (blurTimeout) clearTimeout(blurTimeout);
  };

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
  });
}