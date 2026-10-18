import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  // 👇 加上 as any，強制繞過 Vite 與 Vitest 內部套件版本衝突的型別檢查
  plugins: [vue() as any],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});