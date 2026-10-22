<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { QuestionData } from '../data/questions';
import { VueDraggable } from 'vue-draggable-plus';

const props = defineProps<{
  currentQuestions: QuestionData[];
  // 接收全域教學階段
  currentStages?: ('input' | 'macro' | 'micro' | 'pronunciation' | 'noticing')[];
}>();

// 全域教學階段設定
const globalStages = ref<('input' | 'macro' | 'micro' | 'pronunciation' | 'noticing')[]>(
  props.currentStages || ['input', 'macro', 'micro', 'pronunciation', 'noticing']
);

// 控制側邊欄面板的展開與收合
const isStagesExpanded = ref(true);
const isQuestionsExpanded = ref(true);

const questionMode = ref<'build' | 'reduce'>('build');

const emit = defineEmits<{
  (e: 'update', questions: QuestionData[], stages: ('input' | 'macro' | 'micro' | 'pronunciation' | 'noticing')[]): void;
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
const puzzleLayout = ref<'modifier-left' | 'modifier-right'>('modifier-left');

// 干擾磚與解釋卡狀態
const distractorsInput = ref('');
const explanationTitle = ref('');
const explanationDesc = ref('');

// 克漏字狀態
const clozePrefix = ref('');
const clozeSuffix = ref('');

const fileInput = ref<HTMLInputElement | null>(null);
const modifierFileInput = ref<HTMLInputElement | null>(null);
const uploadTarget = ref<'noun' | 'modifier'>('noun');

const activeUploadTarget = ref<'noun' | 'modifier' | null>(null);

const isEditing = computed(() => editingId.value !== null);

const resetForm = () => {
  editingId.value = null;
  questionType.value = 'standard';
  questionMode.value = 'build';
  imageUrl.value = '';
  targetNoun.value = '';
  relativeSentence.value = '';
  prepositionSentence.value = '';
  chineseSentence.value = '';
  chineseHighlight.value = '';
  modifierImageUrl.value = '';
  puzzleLayout.value = 'modifier-left';
  distractorsInput.value = '';
  explanationTitle.value = '';
  explanationDesc.value = '';
  clozePrefix.value = '';
  clozeSuffix.value = '';
  activeUploadTarget.value = null;
};

const editQuestion = (q: QuestionData) => {
  editingId.value = q.id;
  questionType.value = q.type;
  questionMode.value = q.mode || 'build';
  imageUrl.value = q.imageUrl;
  targetNoun.value = q.targetNoun;
  relativeSentence.value = q.grammarFeature.relative.label;
  prepositionSentence.value = q.grammarFeature.preposition.label;

  distractorsInput.value = q.grammarFeature.relative.distractors?.join(', ') || '';
  explanationTitle.value = q.explanation?.title || '';
  explanationDesc.value = q.explanation?.desc || '';

  if (q.contextCloze) {
    clozePrefix.value = q.contextCloze.prefix;
    clozeSuffix.value = q.contextCloze.suffix;
  }

  if (q.contrastData) {
    chineseSentence.value = q.contrastData.chineseSentence;
    chineseHighlight.value = q.contrastData.chineseHighlight;
    modifierImageUrl.value = q.contrastData.modifierImage;
    puzzleLayout.value = q.contrastData.layout || 'modifier-left';
  }
  activeUploadTarget.value = null;
};

const deleteQuestion = (id: string) => {
  if (confirm('確定要刪除這道題目嗎？')) {
    localQuestions.value = localQuestions.value.filter(q => q.id !== id);
    if (editingId.value === id) resetForm();
  }
};

const triggerUpload = (target: 'noun' | 'modifier') => {
  activeUploadTarget.value = target;
  uploadTarget.value = target;
  if (target === 'noun') fileInput.value?.click();
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
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) hasImage = true;
  }

  if (!hasImage) return;

  if (!activeUploadTarget.value) {
    alert('請先點擊「角色圖片」或「修飾語圖片」的框框，再按貼上喔！');
    event.preventDefault();
    return;
  }

  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        processImage(file, activeUploadTarget.value);
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
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxSize = 800;

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
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

      if (target === 'noun') {
        imageUrl.value = compressedBase64;
      } else {
        modifierImageUrl.value = compressedBase64;
      }
      activeUploadTarget.value = null;
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

  const relCorrect = generateTiles(relativeSentence.value);
  let distractors = distractorsInput.value.split(/[,，\s]+/).filter(Boolean);

  if (distractors.length === 0) {
    const correctWords = relCorrect.map(w => w.toLowerCase());
    if (correctWords.includes('who') || correctWords.includes('which')) distractors.push('she', 'it');
    if (correctWords.includes('wears') || correctWords.includes('has')) distractors.push('wear', 'have');
    distractors = [...new Set(distractors)].filter(d => !correctWords.includes(d.toLowerCase()));
  }

  const finalTiles = [...relCorrect, ...distractors];
  finalTiles.sort(() => Math.random() - 0.5);

  const prepTiles = generateTiles(prepositionSentence.value || '');
  const prepCorrect = [...prepTiles];
  prepTiles.sort(() => Math.random() - 0.5);

  const newQuestion: QuestionData = {
    id: editingId.value || `q_${Date.now()}`,
    type: questionType.value,
    mode: questionMode.value,
    targetNoun: targetNoun.value,
    antecedent: {
      noun: targetNoun.value,
      number: targetNoun.value.toLowerCase().includes('girl') || targetNoun.value.toLowerCase().includes('boy') ? 'singular' : 'plural',
      person: 'person'
    },
    imageUrl: imageUrl.value || 'https://api.dicebear.com/7.x/adventurer/svg?seed=default',
    grammarFeature: {
      relative: { label: relativeSentence.value, tiles: finalTiles, correctAnswer: relCorrect, distractors },
      preposition: { label: prepositionSentence.value, tiles: prepTiles, correctAnswer: prepCorrect }
    },
    explanation: {
      title: explanationTitle.value,
      desc: explanationDesc.value
    },
    inputData: {
      audioText: `${targetNoun.value} ${relativeSentence.value} is my favorite.`,
      options: [
        { image: imageUrl.value, text: '符合描述的角色', isCorrect: true },
        { image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Wrong', text: '不符合描述的角色', isCorrect: false }
      ]
    },
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

  if ((clozePrefix.value || clozeSuffix.value)) {
    newQuestion.contextCloze = {
      prefix: clozePrefix.value,
      suffix: clozeSuffix.value
    };
  }

  if (questionType.value === 'contrast') {
    newQuestion.contrastData = {
      chineseSentence: chineseSentence.value || '中文句子',
      chineseHighlight: chineseHighlight.value || '高亮部分',
      nounImage: imageUrl.value || 'https://api.dicebear.com/7.x/adventurer/svg?seed=default',
      modifierImage: modifierImageUrl.value || 'https://api.dicebear.com/7.x/shapes/svg?seed=default',
      layout: puzzleLayout.value
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
  emit('update', localQuestions.value, globalStages.value);
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <div class="admin-modal">
      <div class="admin-layout">

        <!-- 左側邊欄 -->
        <div class="sidebar">
          <div class="sidebar-header">
            <h2>📚 課前備課中心</h2>
            <p>請在此準備好所有題目，完成後點擊下方按鈕進入學生模式。</p>
          </div>

          <!-- 折疊面板 1：本堂課教學流程 -->
          <div class="sidebar-section">
            <div class="section-header" @click="isStagesExpanded = !isStagesExpanded">
              <h3>🎯 本堂課教學流程</h3>
              <span class="toggle-icon">{{ isStagesExpanded ? '▲' : '▼' }}</span>
            </div>
            <div v-show="isStagesExpanded" class="section-content global-stages">
              <div class="stage-checkboxes"
                style="background: transparent; border: none; padding: 0; gap: 8px; display: flex; flex-direction: column;">
                <label style="font-size: 0.9rem;"><input type="checkbox" value="input" v-model="globalStages">
                  聽力輸入</label>
                <label style="font-size: 0.9rem;"><input type="checkbox" value="macro" v-model="globalStages">
                  巨觀拖拉</label>
                <label style="font-size: 0.9rem;"><input type="checkbox" value="micro" v-model="globalStages">
                  字磚重組</label>
                <label style="font-size: 0.9rem;"><input type="checkbox" value="pronunciation" v-model="globalStages">
                  語音練習</label>
                <label style="font-size: 0.9rem;"><input type="checkbox" value="noticing" v-model="globalStages"> 意識提升
                  (最後一題)</label>
              </div>
            </div>
          </div>

          <!-- 折疊面板 2：題目列表 -->
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
            </div>
          </div>

          <div class="sidebar-footer">
            <button class="btn-close" @click="saveAllAndClose">✅ 完成備課，開始上課</button>
          </div>
        </div>

        <!-- 右側編輯區 -->
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
            <div class="form-group" v-if="questionType === 'standard'">
              <label>題目模式</label>
              <div class="type-switcher">
                <button :class="{ active: questionMode === 'build' }" @click="questionMode = 'build'">
                  一般組句題 (Build)
                </button>
                <button :class="{ active: questionMode === 'reduce' }" @click="questionMode = 'reduce'">
                  關係子句轉換題 (Reduce)
                </button>
              </div>
              <p v-if="questionMode === 'reduce'" style="font-size: 0.8rem; color: #ff9800; margin-top: 8px;">
                提示：轉換題請將正確答案設定為簡化後的句子（如：under the chair），並將 that, is 設為干擾磚。
              </p>
            </div>

            <div class="form-group">
              <label>{{ questionType === 'contrast' ? '名詞圖片 (拼圖右側)' : '角色圖片' }}</label>
              <div class="upload-area" :class="{ 'active-upload': activeUploadTarget === 'noun' }"
                @click="triggerUpload('noun')">
                <img v-if="imageUrl" :src="imageUrl" class="preview-img" />
                <div v-else class="upload-placeholder">
                  <span class="icon">📸</span>
                  <span>點擊後「貼上截圖」或選擇圖片</span>
                  <span v-if="activeUploadTarget === 'noun'" class="text-success">✅ 已就緒！請按 Ctrl+V 貼上</span>
                  <span v-else>點擊此處選擇圖片，或按 Ctrl+V 貼上</span>
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileChange" />
            </div>

            <div class="form-group" v-if="questionType === 'contrast'">
              <label>修飾語圖片 (拼圖左側)</label>
              <div class="upload-area" :class="{ 'active-upload': activeUploadTarget === 'modifier' }"
                @click="triggerUpload('modifier')">
                <img v-if="modifierImageUrl" :src="modifierImageUrl" class="preview-img" />
                <div v-else class="upload-placeholder">
                  <span class="icon">🧩</span>
                  <span>點擊後「貼上截圖」或選擇圖片</span>
                  <span v-if="activeUploadTarget === 'modifier'" class="text-success">✅ 已就緒！請按 Ctrl+V 貼上</span>
                  <span v-else>點擊此處選擇圖片，或按 Ctrl+V 貼上</span>
                </div>
              </div>
              <input ref="modifierFileInput" type="file" accept="image/*" style="display: none"
                @change="handleFileChange" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>目標名詞</label>
                <input v-model="targetNoun" type="text" placeholder="Ex: The girl" @focus="activeUploadTarget = null" />
              </div>
            </div>

            <div class="form-group">
              <label>句型 A：關係子句 (Relative Clause)</label>
              <input v-model="relativeSentence" type="text" placeholder="Ex: who wears a blue uniform"
                @focus="activeUploadTarget = null" />
            </div>

            <div class="form-group">
              <label>迷思干擾磚 (選填，若空白系統會自動生成，例: she, which)</label>
              <input v-model="distractorsInput" type="text" placeholder="Ex: she, which, wear"
                @focus="activeUploadTarget = null" />
            </div>

            <div class="form-group" v-if="questionType === 'standard'">
              <label>克漏字上下文 (選填，建議填寫以提供語境)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input v-model="clozePrefix" type="text" placeholder="Ex: The girl" style="flex: 1;"
                  @focus="activeUploadTarget = null" />
                <span style="font-weight: bold; color: #777;">[ 修飾語 ]</span>
                <input v-model="clozeSuffix" type="text" placeholder="Ex: is my sister." style="flex: 1;"
                  @focus="activeUploadTarget = null" />
              </div>
            </div>

            <template v-if="questionType === 'contrast'">
              <div class="form-group">
                <label>中文句子</label>
                <input v-model="chineseSentence" type="text" placeholder="Ex: 穿藍色制服的女孩"
                  @focus="activeUploadTarget = null" />
              </div>
              <div class="form-group">
                <label>中文高亮 (修飾語部分)</label>
                <input v-model="chineseHighlight" type="text" placeholder="Ex: 穿藍色制服的"
                  @focus="activeUploadTarget = null" />
              </div>

              <div class="form-group">
                <label>拼圖排列方向</label>
                <div class="type-switcher">
                  <button :class="{ active: puzzleLayout === 'modifier-left' }"
                    @click="puzzleLayout = 'modifier-left'">佈局 A (修飾語在左)</button>
                  <button :class="{ active: puzzleLayout === 'modifier-right' }"
                    @click="puzzleLayout = 'modifier-right'">佈局 B (修飾語在右)</button>
                </div>
              </div>

              <div class="form-group">
                <label>解釋卡標題</label>
                <input v-model="explanationTitle" type="text" placeholder="Ex: ✨ 你發現了嗎？"
                  @focus="activeUploadTarget = null" />
              </div>
              <div class="form-group">
                <label>解釋卡說明</label>
                <input v-model="explanationDesc" type="text" placeholder="Ex: 在英文中，修飾語要放在名詞的後面喔！"
                  @focus="activeUploadTarget = null" />
              </div>
            </template>

            <div class="form-group" v-else>
              <label>句型 B：介系詞片語 (Prepositional Phrase)</label>
              <input v-model="prepositionSentence" type="text" placeholder="Ex: in a blue uniform"
                @focus="activeUploadTarget = null" />
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
/* 側邊欄基礎設定 */
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

/* 折疊面板容器 */
.sidebar-section {
  display: flex;
  flex-direction: column;
  border-bottom: 2px solid #e5e5e5;
}

/* 折疊面板標題 */
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

/* 折疊面板內容 */
.section-content {
  padding: 16px 24px;
  background: #ffffff;
}

/* 題目列表專屬滾動區 */
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

/* 其他原有樣式保持不變 */
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
</style>