<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { QuestionData } from '../data/questions';

const props = defineProps<{
  currentQuestions: QuestionData[];
}>();

const emit = defineEmits<{
  (e: 'update', questions: QuestionData[]): void;
  (e: 'close'): void;
}>();

const localQuestions = ref<QuestionData[]>(JSON.parse(JSON.stringify(props.currentQuestions)));

// 表單狀態
const editingId = ref<string | null>(null);
const imageUrl = ref('');
const targetNoun = ref('');
const relativeSentence = ref('');
const prepositionSentence = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const isEditing = computed(() => editingId.value !== null);

const resetForm = () => {
  editingId.value = null;
  imageUrl.value = '';
  targetNoun.value = '';
  relativeSentence.value = '';
  prepositionSentence.value = '';
};

const editQuestion = (q: QuestionData) => {
  editingId.value = q.id;
  imageUrl.value = q.imageUrl;
  targetNoun.value = q.targetNoun;
  relativeSentence.value = q.modifiers.relative.label;
  prepositionSentence.value = q.modifiers.preposition.label;
};

const deleteQuestion = (id: string) => {
  if (confirm('確定要刪除這道題目嗎？')) {
    localQuestions.value = localQuestions.value.filter(q => q.id !== id);
    if (editingId.value === id) resetForm();
  }
};

// 處理圖片上傳
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) processImage(file);
};

// 全局監聽貼上，只處理圖片，不干擾文字貼上
const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        processImage(file);
        event.preventDefault(); // 只有攔截到圖片才阻止預設行為
        break;
      }
    }
  }
};

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste);
});

const processImage = (file: File) => {
  if (file.size > 2 * 1024 * 1024) {
    alert('圖片太大囉！請上傳小於 2MB 的圖片。');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    imageUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const generateTiles = (sentence: string) => {
  return sentence.trim().split(/\s+/).filter(Boolean);
};

const saveQuestion = () => {
  if (!relativeSentence.value || !targetNoun.value) {
    alert('請至少填寫目標名詞與關係子句！');
    return;
  }

  const relTiles = generateTiles(relativeSentence.value);
  const relCorrect = [...relTiles];
  relTiles.sort(() => Math.random() - 0.5);

  const prepTiles = generateTiles(prepositionSentence.value || '');
  const prepCorrect = [...prepTiles];
  prepTiles.sort(() => Math.random() - 0.5);

  const newQuestion: QuestionData = {
    id: editingId.value || `q_${Date.now()}`,
    targetNoun: targetNoun.value,
    antecedent: {
      noun: targetNoun.value,
      number: targetNoun.value.toLowerCase().includes('girl') || targetNoun.value.toLowerCase().includes('boy') ? 'singular' : 'plural',
      person: 'person'
    },
    imageUrl: imageUrl.value || 'https://api.dicebear.com/7.x/adventurer/svg?seed=default',
    modifiers: {
      relative: { label: relativeSentence.value, tiles: relTiles, correctAnswer: relCorrect },
      preposition: { label: prepositionSentence.value, tiles: prepTiles, correctAnswer: prepCorrect }
    }
  };

  if (isEditing.value) {
    const index = localQuestions.value.findIndex(q => q.id === editingId.value);
    if (index !== -1) localQuestions.value[index] = newQuestion;
  } else {
    localQuestions.value.push(newQuestion);
  }
  resetForm();
};

const saveAllAndClose = () => {
  if (localQuestions.value.length === 0) {
    alert('題庫不能為空，請至少保留一題。');
    return;
  }
  emit('update', localQuestions.value);
  emit('close');
};
</script>

<template>
  <div class="admin-modal">
    <div class="admin-layout">
      
      <!-- 左側：題庫清單 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>📚 課前備課中心</h2>
          <p>請在此準備好所有題目，完成後點擊下方按鈕進入學生模式。</p>
        </div>
        
        <div class="question-list">
          <div 
            v-for="(q, index) in localQuestions" 
            :key="q.id" 
            class="question-item"
            :class="{ active: editingId === q.id }"
            @click="editQuestion(q)"
          >
            <div class="q-index">第 {{ index + 1 }} 關</div>
            <div class="q-content">
              <span class="q-noun">{{ q.targetNoun }}</span>
              <span class="q-desc">{{ q.modifiers.relative.label }}</span>
            </div>
            <button class="btn-delete" @click.stop="deleteQuestion(q.id)">✕</button>
          </div>
          
          <button class="btn-new" @click="resetForm" :class="{ active: editingId === null }">
            ➕ 新增題目
          </button>
        </div>

        <div class="sidebar-footer">
          <button class="btn-close" @click="saveAllAndClose">
            ✅ 完成備課，開始上課
          </button>
        </div>
      </div>

      <!-- 右側：編輯表單 -->
      <div class="editor">
        <div class="editor-header">
          <h3>{{ isEditing ? '✏️ 編輯題目' : '🆕 新增題目' }}</h3>
        </div>
        
        <div class="editor-body">
          <div class="form-group">
            <label>角色圖片 (點擊上傳，或在任意處 Ctrl+V 貼上截圖)</label>
            <div class="upload-area" @click="fileInput?.click()">
              <img v-if="imageUrl" :src="imageUrl" class="preview-img" />
              <div v-else class="upload-placeholder">
                <span class="icon">📸</span>
                <span>點擊選擇圖片，或直接貼上截圖</span>
              </div>
            </div>
            <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileChange" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>目標名詞</label>
              <input v-model="targetNoun" type="text" placeholder="Ex: The girl" />
            </div>
          </div>

          <div class="form-group">
            <label>句型 A：關係子句 (Relative Clause)</label>
            <input v-model="relativeSentence" type="text" placeholder="Ex: who wears a blue uniform" />
          </div>

          <div class="form-group">
            <label>句型 B：介系詞片語 (Prepositional Phrase)</label>
            <input v-model="prepositionSentence" type="text" placeholder="Ex: in a blue uniform" />
          </div>
        </div>

        <div class="editor-footer">
          <button v-if="isEditing" class="btn-cancel" @click="resetForm">取消</button>
          <button class="btn-save" @click="saveQuestion">
            {{ isEditing ? '💾 儲存修改' : '✨ 加入題庫' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-modal {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center;
  z-index: 100; backdrop-filter: blur(8px);
}

.admin-layout {
  display: flex;
  width: 90vw;
  max-width: 960px;
  height: 85vh;
  background: #ffffff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0,0,0,0.2);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* 左側邊欄 */
.sidebar {
  width: 320px;
  background: #f7f9fc;
  border-right: 2px solid #e5e5e5;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 2px solid #e5e5e5;
}
.sidebar-header h2 { margin: 0 0 8px 0; font-size: 1.2rem; color: #1cb0f6; }
.sidebar-header p { margin: 0; font-size: 0.85rem; color: #777; line-height: 1.5; }

.question-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.question-item:hover { border-color: #1cb0f6; transform: translateY(-2px); }
.question-item.active { border-color: #1cb0f6; background: #e6f7ff; box-shadow: 0 4px 12px rgba(28,176,246,0.1); }

.q-index { font-size: 0.75rem; color: #1cb0f6; font-weight: bold; }
.q-content { display: flex; flex-direction: column; gap: 2px; padding-right: 20px; }
.q-noun { font-weight: bold; color: #333; font-size: 1.05rem; }
.q-desc { font-size: 0.85rem; color: #777; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.btn-delete {
  position: absolute; top: 12px; right: 12px;
  background: #ffdfe0; color: #ff4b4b; border: none; 
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; justify-content: center; align-items: center;
  font-size: 0.8rem; cursor: pointer; opacity: 0;
  transition: opacity 0.2s;
}
.question-item:hover .btn-delete { opacity: 1; }

.btn-new {
  padding: 16px;
  background: transparent;
  border: 2px dashed #ccc;
  border-radius: 16px;
  color: #777;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-new:hover { border-color: #58cc02; color: #58cc02; background: #f0fff0; }
.btn-new.active { border-color: #58cc02; color: #58cc02; background: #f0fff0; }

.sidebar-footer {
  padding: 24px;
  background: #ffffff;
  border-top: 2px solid #e5e5e5;
}
.btn-close {
  width: 100%;
  padding: 16px;
  background: #1cb0f6;
  color: white;
  border: none;
  border-bottom: 4px solid #1899d6;
  border-radius: 16px;
  font-weight: bold;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.1s;
}
.btn-close:active { border-bottom-width: 0; transform: translateY(4px); }

/* 右側編輯區 */
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.editor-header {
  padding: 24px 32px;
  border-bottom: 2px solid #f0f0f0;
}
.editor-header h3 { margin: 0; color: #333; font-size: 1.3rem; }

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.form-group { margin-bottom: 24px; display: flex; flex-direction: column; }
.form-group label { font-weight: bold; margin-bottom: 10px; color: #555; font-size: 0.95rem; }
.form-group input[type="text"] { 
  padding: 16px; 
  border: 2px solid #e5e5e5; 
  border-radius: 12px; 
  font-size: 1.05rem; 
  outline: none; 
  transition: border 0.2s;
  background: #fafafa;
}
.form-group input[type="text"]:focus { border-color: #1cb0f6; background: #ffffff; box-shadow: 0 0 0 4px rgba(28,176,246,0.1); }

.upload-area {
  border: 2px dashed #ccc; border-radius: 16px; height: 180px;
  display: flex; justify-content: center; align-items: center;
  cursor: pointer; overflow: hidden; background: #fafafa; transition: all 0.2s;
}
.upload-area:hover { border-color: #1cb0f6; background: #e6f7ff; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #999; font-weight: bold; }
.upload-placeholder .icon { font-size: 2rem; }
.preview-img { width: 100%; height: 100%; object-fit: contain; }

.editor-footer {
  padding: 24px 32px;
  border-top: 2px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: #fafafa;
}

.btn-cancel { 
  background: #ffffff; border: 2px solid #e5e5e5; padding: 12px 24px; 
  border-radius: 12px; font-weight: bold; cursor: pointer; color: #777; 
}
.btn-cancel:hover { background: #f0f0f0; }

.btn-save { 
  background: #58cc02; border: none; border-bottom: 4px solid #46a302; 
  padding: 12px 32px; border-radius: 12px; font-weight: bold; color: white; 
  cursor: pointer; font-size: 1rem; transition: all 0.1s;
}
.btn-save:active { border-bottom-width: 0; transform: translateY(4px); }
</style>