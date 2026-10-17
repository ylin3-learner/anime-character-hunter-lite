<script setup lang="ts">
import { ref } from 'vue';
import MicroTileUnscramble from './components/MicroTileUnscramble.vue';
import type { Antecedent } from './rules/types';

// 定義這回合的題目
const currentAntecedent: Antecedent = {
  noun: 'The girl',
  number: 'singular',
  person: 'person'
};

// 故意打散的單字磚（真實場景應該用 shuffle 演算法）
const initialTiles = ['wears', 'uniform', 'who', 'blue', 'a'];

// 遊戲狀態
const isSuccess = ref(false);

// 當組件回報成功時（這部分我們可以等 Sprint 3 再完善，目前先做個按鈕重置）
const resetGame = () => {
  window.location.reload();
};
</script>

<template>
  <div class="app-container">
    <header>
      <h1>🕵️ Anime Character Hunter</h1>
      <p>找出正確的後位修飾句，完成角色解鎖！</p>
    </header>

    <main class="game-card">
      <div class="target-noun">
        <h2>目標名詞：<span class="highlight">{{ currentAntecedent.noun }}</span></h2>
        <p>請把右邊的字磚排成正確的後位修飾句（關係子句）。</p>
      </div>

      <!-- 我們剛剛 TDD 寫出來的微觀字磚組件 -->
      <MicroTileUnscramble 
        :initialTiles="initialTiles" 
        :antecedent="currentAntecedent" 
      />

      <div class="actions">
        <button class="btn-reset" @click="resetGame">重新開始</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

header h1 {
  color: #1cb0f6; /* Duolingo 藍 */
  margin-bottom: 8px;
}

.game-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 2px solid #e5e5e5;
}

.target-noun {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px dashed #e5e5e5;
}

.target-noun h2 {
  font-size: 1.5rem;
  color: #333;
}

.highlight {
  color: #ff4d4d; /* 紅字高亮 */
}

.actions {
  margin-top: 30px;
  text-align: center;
}

.btn-reset {
  padding: 10px 24px;
  background-color: #f0f0f0;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-weight: bold;
  color: #777;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background-color: #e5e5e5;
}
</style>