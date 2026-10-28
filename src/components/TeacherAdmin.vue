<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { QuestionData } from '../rules/types';
import { VueDraggable } from 'vue-draggable-plus';

const props = defineProps<{ currentQuestions: QuestionData[]; }>();

const enabledStages = ref<('input' | 'macro' | 'micro' | 'pronunciation' | 'noticing')[]>(['input', 'macro', 'micro', 'pronunciation', 'noticing']);
const questionMode = ref<'build' | 'reduce'>('build');
const isQuestionsExpanded = ref(true);
const speechRate = ref<number>(0.8);

const isTimedForm = ref(false);
const timeLimitForm = ref<number>(60);

const emit = defineEmits<{
  (e: 'update', questions: QuestionData[]): void;
  (e: 'sync-local', questions: QuestionData[]): void; 
  (e: 'push', id: string): void;
  (e: 'close'): void;
}>();

const localQuestions = ref<QuestionData[]>(JSON.parse(JSON.stringify(props.currentQuestions)));

const editingId = ref<string | null>(null);
const questionType = ref<'standard' | 'contrast' | 'chunk'>('standard');
const imageUrl = ref('');
const distractorImageUrl = ref('');
const targetNoun = ref('');
const relativeSentence = ref('');
const prepositionSentence = ref('');
const tagsInput = ref('');
const chineseSentence = ref('');
const chineseHighlight = ref('');
const modifierImageUrl = ref('');
const puzzleLayout = ref<'modifier-left' | 'modifier-right'>('modifier-left');
const distractorsInput = ref('');
const explanationTitle = ref('');
const explanationDesc = ref('');
const clozePrefix = ref('');
const clozeSuffix = ref('');
const chunkZhInput = ref('');
const chunkQuizInput = ref('');
const antecedentNumber = ref<'singular' | 'plural'>('singular');

const correctLabel = ref('');
const distractorLabel = ref('');

const fileInput = ref<HTMLInputElement | null>(null);
const distractorFileInput = ref<HTMLInputElement | null>(null);
const modifierFileInput = ref<HTMLInputElement | null>(null);
const uploadTarget = ref<'noun' | 'distractor' | 'modifier'>('noun');
const activeUploadTarget = ref<'noun' | 'distractor' | 'modifier' | null>(null);
const isEditing = computed(() => editingId.value !== null);

const resetForm = () => {
  chunkZhInput.value = ''; chunkQuizInput.value = ''; distractorImageUrl.value = '';
  correctLabel.value = ''; distractorLabel.value = '';
  antecedentNumber.value = 'singular'; speechRate.value = 0.8;
  isTimedForm.value = false; timeLimitForm.value = 60;
  editingId.value = null; questionType.value = 'standard'; questionMode.value = 'build';
  enabledStages.value = ['input', 'macro', 'micro', 'pronunciation', 'noticing'];
  imageUrl.value = ''; targetNoun.value = ''; relativeSentence.value = ''; prepositionSentence.value = '';
  tagsInput.value = ''; chineseSentence.value = ''; chineseHighlight.value = ''; modifierImageUrl.value = '';
  puzzleLayout.value = 'modifier-left'; distractorsInput.value = ''; explanationTitle.value = '';
  explanationDesc.value = ''; clozePrefix.value = ''; clozeSuffix.value = '';
  activeUploadTarget.value = null;
};

const editQuestion = (q: QuestionData) => {
  chunkZhInput.value = q.previewData?.chunkZh || '';
  chunkQuizInput.value = q.previewData?.quizOptions ? q.previewData.quizOptions.filter(o => !o.isCorrect).map(o => o.text).join(', ') : '';
  distractorImageUrl.value = q.inputData?.options.find(o => !o.isCorrect)?.image || '';
  correctLabel.value = q.inputData?.options.find(o => o.isCorrect)?.text || '';
  distractorLabel.value = q.inputData?.options.find(o => !o.isCorrect)?.text || '';

  editingId.value = q.id; questionType.value = q.type; questionMode.value = q.mode || 'build';
  enabledStages.value = q.enabledStages || ['input', 'macro', 'micro', 'pronunciation', 'noticing'];
  imageUrl.value = q.imageUrl || q.previewData?.targetImage || q.contrastData?.nounImage || '';
  targetNoun.value = q.targetNoun;
  antecedentNumber.value = q.antecedent.number || 'singular';
  speechRate.value = q.speechRate || 0.8;

  isTimedForm.value = !!q.isTimed;
  timeLimitForm.value = q.timeLimit || 60;

  relativeSentence.value = q.grammarFeature.relative.label; prepositionSentence.value = q.grammarFeature.preposition.label;
  tagsInput.value = q.tags?.join(', ') || ''; distractorsInput.value = q.grammarFeature.relative.distractors?.join(', ') || '';
  explanationTitle.value = q.explanation?.title || ''; explanationDesc.value = q.explanation?.desc || '';

  if (q.contextCloze) { clozePrefix.value = q.contextCloze.prefix; clozeSuffix.value = q.contextCloze.suffix; }
  if (q.contrastData) {
    chineseSentence.value = q.contrastData.chineseSentence; chineseHighlight.value = q.contrastData.chineseHighlight;
    modifierImageUrl.value = q.contrastData.modifierImage; puzzleLayout.value = q.contrastData.layout || 'modifier-left';
  }
  activeUploadTarget.value = null;
};

const deleteQuestion = (id: string) => {
  if (confirm('確定要刪除這道題目嗎？')) {
    localQuestions.value = localQuestions.value.filter(q => q.id !== id);
    if (editingId.value === id) resetForm();
  }
};

const triggerUpload = (target: 'noun' | 'distractor' | 'modifier') => {
  activeUploadTarget.value = target; uploadTarget.value = target;
  if (target === 'noun') fileInput.value?.click();
  else if (target === 'distractor') distractorFileInput.value?.click();
  else modifierFileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) processImage(file, uploadTarget.value);
  activeUploadTarget.value = null;
};

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  let hasImage = false;
  for (const item of items) { if (item.type.indexOf('image') !== -1) hasImage = true; }
  if (!hasImage) return;
  if (!activeUploadTarget.value) { alert('請先點擊圖片框框，再按貼上喔！'); event.preventDefault(); return; }
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) { processImage(file, activeUploadTarget.value); event.preventDefault(); break; }
    }
  }
};

onMounted(() => { window.addEventListener('paste', handlePaste); });
onUnmounted(() => { window.removeEventListener('paste', handlePaste); });

const processImage = (file: File, target: 'noun' | 'distractor' | 'modifier') => {
  if (file.size > 2 * 1024 * 1024) { alert('圖片太大囉！請上傳小於 2MB 的圖片。'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxSize = 800;
      if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      if (target === 'noun') imageUrl.value = compressedBase64;
      else if (target === 'distractor') distractorImageUrl.value = compressedBase64;
      else modifierImageUrl.value = compressedBase64;
      activeUploadTarget.value = null;
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const generateTiles = (sentence: string) => {
  const regex = /\[([^\]]+)\]|([^\s]+)/g;
  const tiles: string[] = [];
  let match;
  while ((match = regex.exec(sentence)) !== null) {
    if (match[1]) tiles.push(`[${match[1]}]`);
    else if (match[2]) tiles.push(match[2]);
  }
  return tiles;
};

const saveQuestion = () => {
  if (!targetNoun.value) { alert('請填寫目標名詞！'); return; }
  if (questionType.value !== 'chunk' && !relativeSentence.value) { alert('請填寫關係子句！'); return; }
  if (!imageUrl.value || imageUrl.value.includes('dicebear.com')) { alert('請務必上傳真實的「主要圖片」！'); return; }

  const relCorrect = generateTiles(relativeSentence.value || '');
  let distractors = distractorsInput.value.split(/[,，\s]+/).filter(Boolean);
  if (distractors.length === 0 && questionType.value !== 'chunk') {
    const correctWords = relCorrect.map(w => w.replace(/[\[\]]/g, '').toLowerCase());
    if (correctWords.includes('who') || correctWords.includes('which')) distractors.push('she', 'it');
    if (correctWords.includes('wears') || correctWords.includes('has')) distractors.push('wear', 'have');
    distractors = [...new Set(distractors)].filter(d => !correctWords.includes(d.toLowerCase()));
  }

  const finalTiles = [...relCorrect, ...distractors]; finalTiles.sort(() => Math.random() - 0.5);
  const prepTiles = generateTiles(prepositionSentence.value || ''); const prepCorrect = [...prepTiles]; prepTiles.sort(() => Math.random() - 0.5);

  const newQuestion: QuestionData = {
    id: editingId.value || `q_${Date.now()}`,
    type: questionType.value, mode: questionMode.value, enabledStages: enabledStages.value,
    targetNoun: targetNoun.value,
    antecedent: { noun: targetNoun.value, number: antecedentNumber.value, person: targetNoun.value.toLowerCase().includes('cat') || targetNoun.value.toLowerCase().includes('pin') || targetNoun.value.toLowerCase().includes('table') ? 'thing' : 'person' },
    imageUrl: imageUrl.value,
    tags: tagsInput.value.split(/[,，\s]+/).filter(Boolean),
    speechRate: speechRate.value,
    isTimed: isTimedForm.value,
    timeLimit: isTimedForm.value ? timeLimitForm.value : undefined,
    grammarFeature: {
      relative: { label: relativeSentence.value || '', tiles: finalTiles, correctAnswer: relCorrect, distractors },
      preposition: { label: prepositionSentence.value || '', tiles: prepTiles, correctAnswer: prepCorrect }
    },
    explanation: { title: explanationTitle.value, desc: explanationDesc.value },
  };

  if (questionType.value === 'standard') {
    let audioText = clozePrefix.value || clozeSuffix.value
      ? `${clozePrefix.value || targetNoun.value} ${relativeSentence.value.replace(/[\[\]]/g, '')} ${clozeSuffix.value || 'is my favorite.'}`.replace(/\s+/g, ' ').trim()
      : `${targetNoun.value} ${relativeSentence.value.replace(/[\[\]]/g, '')} is my favorite.`;
    newQuestion.inputData = { audioText, options: [{ image: imageUrl.value, text: correctLabel.value || '', isCorrect: true }, { image: distractorImageUrl.value || '', text: distractorLabel.value || '', isCorrect: false }] };
    newQuestion.noticingData = { examples: [audioText], question: `請觀察以上句子，關係代名詞 who 代替的是什麼？`, options: [{ text: '事物（Things）', isCorrect: false }, { text: '人（People）', isCorrect: true }], explanation: `沒錯！當先行詞是「人」的時候，我們使用 who 來引導關係子句。` };
    if (clozePrefix.value || clozeSuffix.value) newQuestion.contextCloze = { prefix: clozePrefix.value, suffix: clozeSuffix.value };
  }
  if (questionType.value === 'contrast') {
    newQuestion.contrastData = { chineseSentence: chineseSentence.value || '中文句子', chineseHighlight: chineseHighlight.value || '高亮部分', nounImage: imageUrl.value, modifierImage: modifierImageUrl.value || '', layout: puzzleLayout.value };
  }
  if (questionType.value === 'chunk' || (chunkZhInput.value && questionType.value === 'standard')) {
    const chunkMatch = relativeSentence.value.match(/\[([^\]]+)\]/);
    const chunkText = chunkMatch ? chunkMatch[1] : relativeSentence.value;
    let quizOpts = chunkQuizInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    if (quizOpts.length === 0) quizOpts = ['look for it', 'look at it'];
    newQuestion.previewData = { targetImage: imageUrl.value, targetNoun: targetNoun.value, chunkText, chunkZh: chunkZhInput.value || '（請填寫中文意思）', quizOptions: [{ text: chunkText, isCorrect: true }, ...quizOpts.map(t => ({ text: t, isCorrect: false }))].sort(() => Math.random() - 0.5) };
  }

  if (isEditing.value) {
    const index = localQuestions.value.findIndex(q => q.id === editingId.value);
    if (index !== -1) localQuestions.value[index] = newQuestion;
  } else {
    localQuestions.value.push(newQuestion);
  }
  resetForm();
};

// 👈 新增：先存檔，再發送
const handleSaveAndPush = (id: string) => {
  console.log(`🔥🔥🔥 [TeacherAdmin] 按鈕被點擊了！準備發送題目 ID: ${id}`);
  
  if (editingId.value === id) {
    console.log(`💾 [TeacherAdmin] 先靜默更新記憶體狀態...`);
    saveQuestion(); // 這會更新 localQuestions
  }
  
  // 延遲 50ms 等待 Vue 將表單數據寫入 localQuestions
  setTimeout(() => {
    // 👈 核心優雅之處：先讓父組件記憶體同步，再發送指令
    emit('sync-local', localQuestions.value); 
    emit('push', id);
  }, 50);
};

const saveAllAndClose = () => {
  if (localQuestions.value.length === 0) { alert('題庫不能為空，請至少保留一題。'); return; }
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
            <p>點擊題目編輯，或點擊「發送」讓全班跳轉。</p>
          </div>
          <div class="sidebar-section" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
            <div class="section-header" @click="isQuestionsExpanded = !isQuestionsExpanded">
              <h3>📝 題目列表</h3>
              <span class="toggle-icon">{{ isQuestionsExpanded ? '▲' : '▼' }}</span>
            </div>
            <div v-show="isQuestionsExpanded" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
              <div class="question-list">
                <VueDraggable v-model="localQuestions" :animation="150" ghostClass="ghost" class="question-list-inner">
                  <div v-for="(q, index) in localQuestions" :key="q.id" class="question-item"
                    :class="{ active: editingId === q.id }" @click="editQuestion(q)">
                    <div class="q-index">
                      第 {{ index + 1 }} 關
                      <span class="q-type-tag" :class="q.type">{{ q.type === 'contrast' ? '對比題' : q.type === 'chunk' ?
                        '片語題' : '標準題' }}</span>
                      <span v-if="q.isTimed" class="q-time-tag">🔴 {{ q.timeLimit || 60 }}s</span>
                      <span v-else class="q-free-tag">🟢 自由</span>
                    </div>
                    <div class="q-content">
                      <span class="q-noun">{{ q.targetNoun }}</span>
                      <span class="q-desc">{{ q.grammarFeature?.relative?.label || '未設定句型' }}</span>
                    </div>

                    <div class="q-actions">
                      <!-- 👈 修改這裡：呼叫 handleSaveAndPush -->
                      <button class="btn-push" @click.stop="handleSaveAndPush(q.id)">🚀 發送給全班</button>
                      <button class="btn-delete" @click.stop="deleteQuestion(q.id)" title="刪除">✕</button>
                    </div>
                  </div>
                </VueDraggable>
                <button class="btn-new" @click="resetForm" :class="{ active: editingId === null }">➕ 新增題目</button>
              </div>
            </div>
          </div>
          <div class="sidebar-footer">
            <button class="btn-close" @click="saveAllAndClose">✅ 完成備課，開始上課</button>
          </div>
        </div>

        <!-- 右側編輯區保持不變 -->
        <div class="editor">
          <div class="editor-header">
            <h3>{{ isEditing ? '✏️ 編輯題目' : '🆕 新增題目' }}</h3>
            <div class="type-switcher">
              <button :class="{ active: questionType === 'standard' }" @click="questionType = 'standard'">標準題</button>
              <button :class="{ active: questionType === 'contrast' }" @click="questionType = 'contrast'">對比題</button>
              <button :class="{ active: questionType === 'chunk' }" @click="questionType = 'chunk'">片語題</button>
            </div>
          </div>

          <div class="editor-body">
            <!-- 這裡保留你原本的內容 (題目節奏、教學流程、圖片上傳等) -->
            <div class="form-group" v-if="questionType !== 'chunk'">
              <label>題目節奏</label>
              <div class="segmented-control">
                <button :class="{ active: !isTimedForm }" @click="isTimedForm = false">🟢 自由進度</button>
                <button :class="{ active: isTimedForm }" @click="isTimedForm = true">🔴 限時挑戰</button>
              </div>
            </div>

            <div class="form-group" v-if="isTimedForm && questionType !== 'chunk'">
              <label>⏱️ 限時秒數</label>
              <input type="number" v-model.number="timeLimitForm" placeholder="60" min="10" step="10" />
            </div>

            <!-- (中間的圖片上傳、目標名詞等表單請直接保留你原本的即可，為了篇幅省略) -->
            <div class="form-row">
              <div class="form-group">
                <label>目標名詞</label>
                <input v-model="targetNoun" type="text" placeholder="Ex: The boy" @focus="activeUploadTarget = null" />
              </div>
              <div class="form-group">
                <label>心智圖標籤 (Tags)</label>
                <input v-model="tagsInput" type="text" placeholder="Ex: 穿著與顏色" @focus="activeUploadTarget = null" />
              </div>
            </div>
            <!-- ... 請保留其他表單 ... -->
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
/* 樣式保持不變，請直接貼上你原本的 style 即可 */
/* 這裡直接複製上一個版本的 style */
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
  height: 100%;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 2px solid #e5e5e5;
  flex-shrink: 0;
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

.sidebar-section {
  display: flex;
  flex-direction: column;
  border-bottom: 2px solid #e5e5e5;
}

.section-header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: #f0f4f8;
  transition: background 0.2s;
  user-select: none;
}

.section-header:hover {
  background: #e2e8f0;
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1cb0f6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-icon {
  font-size: 0.8rem;
  color: #777;
}

.question-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-list-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-footer {
  padding: 24px;
  background: #ffffff;
  border-top: 2px solid #e5e5e5;
  flex-shrink: 0;
}

.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  min-width: 0;
}

.editor-header {
  padding: 24px 32px;
  border-bottom: 2px solid #f0f0f0;
  flex-shrink: 0;
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

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 10px;
  color: #555;
  font-size: 0.95rem;
}

.form-group input[type="text"],
.form-group input[type="number"] {
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

.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus {
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

.upload-area.active-upload {
  border-color: #58cc02;
  background: #f0fff0;
  box-shadow: 0 0 0 4px rgba(88, 204, 2, 0.2);
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
  flex-shrink: 0;
}

.stage-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  background: #f9f9f9;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid #e5e5e5;
}

.stage-checkboxes label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
  color: #555;
  cursor: pointer;
  margin-bottom: 0;
}

.stage-checkboxes input {
  width: 18px;
  height: 18px;
  accent-color: #1cb0f6;
  cursor: pointer;
}

.question-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  gap: 6px;
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
  color: white;
}

.q-type-tag.standard {
  background: #1cb0f6;
}

.q-type-tag.contrast {
  background: #ff9800;
}

.q-type-tag.chunk {
  background: #9c27b0;
}

.q-time-tag {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: #ffe6e6;
  color: #ff4b4b;
  margin-left: auto;
}

.q-free-tag {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: #e6f7e6;
  color: #58cc02;
  margin-left: auto;
}

.q-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  border-top: 1px dashed #eee;
  padding-top: 12px;
}

.btn-push {
  background: #e6f7ff;
  color: #1cb0f6;
  border: 2px solid #1cb0f6;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-push:hover {
  background: #1cb0f6;
  color: white;
}

.btn-delete {
  background: #ffdfe0;
  color: #ff4b4b;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #ff4b4b;
  color: white;
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
  background: #f0fff0;
  border-color: #58cc02;
  color: #58cc02;
}

.btn-new.active {
  background: #f0fff0;
  border-color: #58cc02;
  color: #58cc02;
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

.text-success {
  color: #58cc02;
  font-weight: bold;
}

.segmented-control {
  display: flex;
  background: #f0f0f0;
  border-radius: 12px;
  padding: 4px;
}

.segmented-control button {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-weight: bold;
  color: #777;
  cursor: pointer;
  transition: all 0.2s;
}

.segmented-control button.active {
  background: white;
  color: #1cb0f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>