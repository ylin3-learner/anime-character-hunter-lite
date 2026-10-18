# 🕵️ Anime Character Hunter Lite (動漫角色大搜尋)

**[English](README.md) | [繁體中文](README.zh-TW.md)**

這是一套專為國中小（K-12）設計的英語文法互動學習軟體，基於**「認知流水線 (Cognitive Pipeline)」**與二語習得（SLA）理論打造。

本專案採用 **Vue 3、TypeScript 與 Vite** 開發，專注解決學生在學習**「後位修飾（關係子句與介系詞片語）」**時的痛點，包含母語（中文前位修飾）干擾，以及常見的迷思概念（如關代後重複代名詞 `who she`）。

## 🧠 核心認知流水線（教學法驅動設計）

傳統文法 App 僅停留在機械式練習。本系統結合二語習得理論，引導學生走完完整的認知閉環：

1. **輸入加工 (Structured Input)**：聽句子選正確圖片，強迫大腦在產出前先建立「形式」與「意義」的連結。
2. **空間建構 (Macro Drag)**：透過物理拖拉，將圖塊放到名詞**後方**，打破中文「前位修飾」的習慣。
3. **形式聚焦 (Micro Tiles)**：排列單字磚。內建的語法規則引擎會偵測迷思（如 `DUPLICATE_PRONOUN`），並給予「引導式提示」而非直接給答案。
4. **韻律與輸出 (Pronunciation)**：結合 TTS 標準發音（支援 0.5x/0.85x/1.0x 倍速）與 STT 語音辨識，並用「文字差異比對」讓學生一眼看出哪個單字漏唸了。
5. **意識提升 (Noticing Board)**：基於 PACE 教學模型，跳出「文法小偵探」面板，讓學生觀察例句並「自己歸納」出文法規則。

## ✨ 主要功能

### 學生端
- **中英對比拼圖 (Contrast Puzzle)**：首創拖拽式拼圖合體，讓學生用視覺與觸覺，秒懂中文「修飾語在名詞前」與英文「修飾語在名詞後」的差異。
- **即時引導式反饋**：排錯字磚時給予紅色警示與溫和提示，引導學生自我修正，降低學習焦慮。
- **發音診斷面板**：錄音後自動比對目標句子，命中的單字變綠色，漏唸的單字變灰色刪除線，方便老師巡場診斷。

### 教師端 (課前備課中心)
- **零程式碼出題**：支援截圖貼上（自動壓縮以節省空間），輸入句子後，系統自動切分字磚、生成聽力題與歸納板資料。
- **直覺拖拽排序**：透過拖拽卡片，輕鬆調整關卡順序與難度梯度。
- **本機優先 (Local-First)**：所有老師自訂的題庫皆安全儲存在瀏覽器 `localStorage`，無需伺服器後端。

## 🛠️ 技術棧與工程架構

- **前端框架**：Vue 3 (Composition API) + Vite + TypeScript
- **測試驅動開發 (TDD)**：使用 Vitest 為核心文法規則引擎編寫單元測試，確保教學邏輯 100% 正確。
- **語音技術**：原生 Web Speech API（無外部 API 依賴）
- **拖拽技術**：原生 Pointer Events & `vue-draggable-plus`
- **架構設計**：嚴格分離領域邏輯（Domain Rules）、服務（Services）與視圖（Features）

## 🚀 快速開始

### 本機開發

```bash
npm install
npm run dev
```

### 執行測試

``` bash
npm test
```

### 部署至 GitHub Pages

``` bash
npm run deploy
```

📚 教學理論參考文獻

- 加工教學 (Processing Instruction)：VanPatten (1996)

- 注意假說 (Noticing Hypothesis)：Schmidt (1990)

- PACE 模型：Adair-Hauck & Donato (2002)

- 形式聚焦 (Focus on Form)：Long (1991)

本專案基於認知負荷理論 (Cognitive Load Theory) 與教育科技技術債管理思維所開發。

