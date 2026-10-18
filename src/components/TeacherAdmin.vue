<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { QuestionData } from '../data/questions';
import { VueDraggable } from 'vue-draggable-plus';

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
const questionType = ref<'standard' | 'contrast'>('standard');

const imageUrl = ref('');
const targetNoun = ref('');
const relativeSentence = ref('');
const prepositionSentence = ref('');

const chineseSentence = ref('');
const chineseHighlight = ref('');
const modifierImageUrl = ref('');

const fileInput = ref<HTMLInputElement | null>(null);
const modifierFileInput = ref<HTMLInputElement | null>(null);
const uploadTarget = ref<'noun' | 'modifier'>('noun');

const isEditing = computed(() => editingId.value !== null);

const resetForm = () => {
  editingId.value = null;
  questionType.value = 'standard';
  imageUrl.value = '';
  targetNoun.value = '';
  relativeSentence.value = '';
  prepositionSentence.value = '';
  chineseSentence.value = '';
  chineseHighlight.value = '';
  modifierImageUrl.value = '';
};

const editQuestion = (q: QuestionData) => {
  editingId.value = q.id;
  questionType.value = q.type;
  imageUrl.value = q.imageUrl;
  targetNoun.value = q.targetNoun;
  relativeSentence.value = q.grammarFeature.relative.label;
  prepositionSentence.value = q.grammarFeature.preposition.label;

  if (q.contrastData) {
    chineseSentence.value = q.contrastData.chineseSentence;
    chineseHighlight.value = q.contrastData.chineseHighlight;
    modifierImageUrl.value = q.contrastData.modifierImage;
  }
};

const deleteQuestion = (id: string) => {
  if (confirm('確定要刪除這道題目嗎？')) {
    localQuestions.value = localQuestions.value.filter(q => q.id !== id);
    if (editingId.value === id) resetForm();
  }
};

const triggerUpload = (target: 'noun' | 'modifier') => {
  uploadTarget.value = target;
  if (target === 'noun') fileInput.value?.click();
  else modifierFileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) processImage(file, uploadTarget.value);
};

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        const target = (questionType.value === 'contrast' && imageUrl.value && !modifierImageUrl.value) ? 'modifier' : 'noun';
        processImage(file, target);
        event.preventDefault();
        break;
      }
    }
  }
};

onMounted(() => { window.addEventListener('paste', handlePaste); });
onUnmounted(() => { window.removeEventListener('paste', handlePaste); });

const processImage = (file: File, target: 'noun' | 'modifier') => {
  if (file.size > 2 * 1024 * 1024) {
    alert('圖片太大囉！請上傳小於 2MB 的圖片。');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 使用 Canvas 進行壓縮
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxSize = 800; // 限制最大寬度/高度為 800px

      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // 轉回 Base64 (JPEG 壓縮率 0.7)
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

      if (target === 'noun') {
        imageUrl.value = compressedBase64;
      } else {
        modifierImageUrl.value = compressedBase64;
      }
    };
    img.src = e.target?.result as string;
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
    type: questionType.value,
    targetNoun: targetNoun.value,
    antecedent: {
      noun: targetNoun.value,
      number: targetNoun.value.toLowerCase().includes('girl') || targetNoun.value.toLowerCase().includes('boy') ? 'singular' : 'plural',
      person: 'person'
    },
    imageUrl: imageUrl.value || 'https://api.dicebear.com/7.x/adventurer/svg?seed=default',
    grammarFeature: {
      relative: { label: relativeSentence.value, tiles: relTiles, correctAnswer: relCorrect },
      preposition: { label: prepositionSentence.value, tiles: prepTiles, correctAnswer: prepCorrect }
    },
    // 👇 自動生成輸入加工資料
    inputData: {
      audioText: `${targetNoun.value} ${relativeSentence.value} is my favorite.`,
      options: [
        { image: imageUrl.value, text: '符合描述的角色', isCorrect: true },
        { image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Wrong', text: '不符合描述的角色', isCorrect: false }
      ]
    },
    // 👇 自動生成意識提升資料
    noticingData: {
      examples: [
        `${targetNoun.value} ${relativeSentence.value} is my favorite.`,
        `The boy ${relativeSentence.value.replace(/^who /, 'who ')} is my brother.`
      ],
      question: `請觀察以上句子，關係代名詞 who 代替的是什麼？`,
      options: [
        { text: '事物（Things）', isCorrect: false },
        { text: '人（People）', isCorrect: true }
      ],
      explanation: `沒錯！當先行詞是「人」的時候，我們使用 who 來引導關係子句。`
    }
  };

  if (questionType.value === 'contrast') {
    newQuestion.contrastData = {
      chineseSentence: chineseSentence.value || '中文句子',
      chineseHighlight: chineseHighlight.value || '高亮部分',
      nounImage: imageUrl.value || 'https://api.dicebear.com/7.x/adventurer/svg?seed=default',
      modifierImage: modifierImageUrl.value || 'https://api.dicebear.com/7.x/shapes/svg?seed=default'
    };
  }

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
  <Teleport to="body">
    <div class="admin-modal">
      <div class="admin-layout">
        <div class="sidebar">
          <div class="sidebar-header">
            <h2>📚 課前備課中心</h2>
            <p>請在此準備好所有題目，完成後點擊下方按鈕進入學生模式。</p>
          </div>
          <div class="question-list">
            <VueDraggable v-model="localQuestions" :animation="150" ghostClass="ghost" class="question-list">
              <div v-for="(q, index) in localQuestions" :key="q.id" class="question-item"
                :class="{ active: editingId === q.id }" @click="editQuestion(q)">
                <div class="q-index">
                  第 {{ index + 1 }} 關
                  <span class="q-type-tag" :class="q.type">{{ q.type === 'contrast' ? '對比題' : '標準題' }}</span>
                </div>
                <div class="q-content">
                  <span class="q-noun">{{ q.targetNoun }}</span>
                  <span class="q-desc">{{ q.grammarFeature?.relative?.label || '未設定句型' }}</span>
                </div>
                <button class="btn-delete" @click.stop="deleteQuestion(q.id)">✕</button>
              </div>
            </VueDraggable>
            <button class="btn-new" @click="resetForm" :class="{ active: editingId === null }">➕ 新增題目</button>
          </div>
          <div class="sidebar-footer">
            <button class="btn-close" @click="saveAllAndClose">✅ 完成備課，開始上課</button>
          </div>
        </div>

        <div class="editor">
          <div class="editor-header">
            <h3>{{ isEditing ? '✏️ 編輯題目' : '🆕 新增題目' }}</h3>
            <div class="type-switcher">
              <button :class="{ active: questionType === 'standard' }" @click="questionType = 'standard'">標準題
                (拖拉+重組)</button>
              <button :class="{ active: questionType === 'contrast' }" @click="questionType = 'contrast'">對比題
                (拼圖+中英對照)</button>
            </div>
          </div>

          <div class="editor-body">
            <div class="form-group">
              <label>{{ questionType === 'contrast' ? '名詞圖片 (拼圖右側)' : '角色圖片' }}</label>
              <div class="upload-area" @click="triggerUpload('noun')">
                <img v-if="imageUrl" :src="imageUrl" class="preview-img" />
                <div v-else class="upload-placeholder"><span class="icon">📸</span><span>點擊選擇圖片，或貼上截圖</span></div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileChange" />
            </div>

            <div class="form-group" v-if="questionType === 'contrast'">
              <label>修飾語圖片 (拼圖左側)</label>
              <div class="upload-area" @click="triggerUpload('modifier')">
                <img v-if="modifierImageUrl" :src="modifierImageUrl" class="preview-img" />
                <div v-else class="upload-placeholder"><span class="icon">🧩</span><span>點擊選擇圖片，或貼上截圖</span></div>
              </div>
              <input ref="modifierFileInput" type="file" accept="image/*" style="display: none"
                @change="handleFileChange" />
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

            <template v-if="questionType === 'contrast'">
              <div class="form-group">
                <label>中文句子</label>
                <input v-model="chineseSentence" type="text" placeholder="Ex: 穿藍色制服的女孩" />
              </div>
              <div class="form-group">
                <label>中文高亮 (修飾語部分)</label>
                <input v-model="chineseHighlight" type="text" placeholder="Ex: 穿藍色制服的" />
              </div>
            </template>

            <div class="form-group" v-else>
              <label>句型 B：介系詞片語 (Prepositional Phrase)</label>
              <input v-model="prepositionSentence" type="text" placeholder="Ex: in a blue uniform" />
            </div>
          </div>

          <div class="editor-footer">
            <button v-if="isEditing" class="btn-cancel" @click="resetForm">取消</button>
            <button class="btn-save" @click="saveQuestion">{{ isEditing ? '💾 儲存修改' : '✨ 加入題庫' }}</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 樣式保持不變 */
.admin-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.admin-layout {
  display: flex;
  width: 90vw;
  max-width: 1000px;
  height: 85vh;
  background: #ffffff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

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

.sidebar-header h2 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  color: #1cb0f6;
}

.sidebar-header p {
  margin: 0;
  font-size: 0.85rem;
  color: #777;
  line-height: 1.5;
}

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

.question-item:hover {
  border-color: #1cb0f6;
  transform: translateY(-2px);
}

.question-item.active {
  border-color: #1cb0f6;
  background: #e6f7ff;
  box-shadow: 0 4px 12px rgba(28, 176, 246, 0.1);
}

.q-index {
  font-size: 0.75rem;
  color: #1cb0f6;
  font-weight: bold;
  display: flex;
  align-items: center;
}

.q-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 20px;
}

.q-noun {
  font-weight: bold;
  color: #333;
  font-size: 1.05rem;
}

.q-desc {
  font-size: 0.85rem;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-type-tag {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  color: white;
}

.q-type-tag.standard {
  background: #1cb0f6;
}

.q-type-tag.contrast {
  background: #ff9800;
}

.btn-delete {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #ffdfe0;
  color: #ff4b4b;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.question-item:hover .btn-delete {
  opacity: 1;
}

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

.btn-new:hover {
  border-color: #58cc02;
  color: #58cc02;
  background: #f0fff0;
}

.btn-new.active {
  border-color: #58cc02;
  color: #58cc02;
  background: #f0fff0;
}

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

.btn-close:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

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

.editor-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
}

.type-switcher {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.type-switcher button {
  flex: 1;
  padding: 10px;
  background: #f0f0f0;
  border: 2px solid transparent;
  border-radius: 12px;
  font-weight: bold;
  color: #777;
  cursor: pointer;
  transition: all 0.2s;
}

.type-switcher button.active {
  background: #e6f7ff;
  border-color: #1cb0f6;
  color: #1cb0f6;
}

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.form-group {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 10px;
  color: #555;
  font-size: 0.95rem;
}

.form-group input[type="text"] {
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-size: 1.05rem;
  outline: none;
  transition: border 0.2s;
  background: #fafafa;
  width: 100%;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus {
  border-color: #1cb0f6;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(28, 176, 246, 0.1);
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 16px;
  height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  overflow: hidden;
  background: #fafafa;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: #1cb0f6;
  background: #e6f7ff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #999;
  font-weight: bold;
}

.upload-placeholder .icon {
  font-size: 2rem;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.editor-footer {
  padding: 24px 32px;
  border-top: 2px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: #fafafa;
}

.btn-cancel {
  background: #ffffff;
  border: 2px solid #e5e5e5;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  color: #777;
}

.btn-cancel:hover {
  background: #f0f0f0;
}

.btn-save {
  background: #58cc02;
  border: none;
  border-bottom: 4px solid #46a302;
  padding: 12px 32px;
  border-radius: 12px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.1s;
}

.btn-save:active {
  border-bottom-width: 0;
  transform: translateY(4px);
}

.ghost {
  opacity: 0.5;
  background: #c8ebfb;
  border: 2px dashed #1cb0f6;
}
</style>