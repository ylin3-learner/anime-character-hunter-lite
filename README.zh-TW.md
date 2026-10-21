
---

### 📄 2. `README.zh-TW.md` (繁體中文版)

```markdown
# 🕵️ Anime Character Hunter Lite (動漫角色大搜尋)

**[English](README.md) | [繁體中文](README.zh-TW.md)**

這是一套專為國中小（K-12）設計的英語文法互動學習軟體，基於 **「認知流水線 (Cognitive Pipeline)」** 與 **二語習得（SLA）** 理論打造。

本專案採用 **Vue 3、TypeScript、Vite 與 Supabase** 開發，專注解決學生在學習**「後位修飾（關係子句與介系詞片語）」**時的痛點，包含母語（中文前位修飾）干擾，以及常見的迷思概念（如關代後重複代名詞 `who she`）。

## 🧠 核心認知流水線（教學法驅動設計）

傳統文法 App 僅停留在機械式練習。本系統結合二語習得理論，引導學生走完完整的認知閉環：

1. **輸入加工 (Structured Input)**：聽句子選正確圖片，強迫大腦在產出前先建立「形式」與「意義」的連結。
2. **空間建構 (Contrast Puzzle & Macro Drag)**：透過中英對比拼圖或物理拖拉，將圖塊放到名詞**後方**，打破中文「前位修飾」的習慣。
3. **形式聚焦 (Micro Tiles)**：排列單字磚。內建的語法規則引擎會偵測迷思（如 `DUPLICATE_PRONOUN`），並給予「引導式提示」而非直接給答案。系統亦會自動生成干擾磚（如 *she*, *which*）。
4. **韻律與輸出 (Pronunciation)**：結合 TTS 標準發音（支援倍速）與 STT 語音辨識，並用「文字差異比對」讓學生一眼看出哪個單字漏唸了。
5. **意識提升 (Noticing Board & Explanation Cards)**：基於 PACE 教學模型，跳出「文法小偵探」面板與「文法解釋卡」，讓學生觀察例句並「自己歸納」出文法規則。

## ✨ 主要功能

### 學生端
- **中線磁吸拼圖 (Center-Line Magnetic Snapping)**：首創帶有「幽靈放置槽」與「跨越中線判定」的拖拽拼圖，讓學生用視覺與觸覺秒懂中英語序差異。
- **即時引導式反饋**：排錯字磚時給予紅色警示與溫和提示，引導學生自我修正，降低學習焦慮。
- **過關與錯誤音效**：使用 Web Audio API 合成清脆的上升音階與低沉的警示音，提供沈浸式反饋。
- **發音診斷面板**：錄音後自動比對目標句子，命中的單字變綠色，漏唸的單字變灰色刪除線，方便老師巡場診斷。

### 教師端 (課前備課中心)

- **零程式碼出題**：支援截圖貼上（自動壓縮以節省空間），輸入句子後，系統自動切分字磚、生成聽力題與歸納板資料。
- **雲端題庫同步 (Supabase)**：老師在電腦上備課後，資料即時同步至雲端。學生在平板上重新整理即可獲取最新題目，並保留 `localStorage` 作為斷網備份。
- **全班學習軌跡分析**：內建數據儀表板，即時統計全班踩過的文法迷思、字序錯誤與拼圖錯誤，並以長條圖視覺化呈現，幫助老師精準掌握教學痛點。
- **雙重密碼防護**：教師備課中心與數據分析面板皆設有密碼鎖，防止學生誤觸刪除題庫或清空學習紀錄。
- **自動生成干擾磚**：老師若未填寫迷思干擾磚，系統會根據句型自動注入常見迷思字（如 *she*, *wear*）。
- **自訂解釋卡**：老師可自由設定拼圖成功後彈出的文法解釋卡標題與說明。
- **直覺拖拽排序**：透過拖拽卡片，輕鬆調整關卡順序與難度梯度。

## 🛠️ 技術棧與工程架構

- **前端框架**：Vue 3 (Composition API) + Vite + TypeScript
- **資料庫**：Supabase (PostgreSQL)，用於雲端題庫同步與學習軌跡收集
- **測試驅動開發 (TDD)**：使用 Vitest 為核心文法規則引擎編寫單元測試，確保教學邏輯 100% 正確。
- **語音技術**：原生 Web Speech API（無外部 API 依賴）
- **拖拽技術**：原生 Pointer Events & `vue-draggable-plus`
- **音效技術**：原生 Web Audio API（即時合成無版權音效）
- **架構設計**：嚴格分離領域邏輯（Domain Rules）、服務（Services）與視圖（Features）

## 🚀 快速開始

### 環境變數設定
在根目錄建立 `.env.local` 檔案，並填入你的 Supabase 憑證：
```env
VITE_SUPABASE_URL=你的_Supabase_專案網址
VITE_SUPABASE_ANON_KEY=你的_Supabase_匿名金鑰
```

### 本機開發

``` bash
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

本專案基於認知負荷理論 (Cognitive Load Theory)、數據驅動教學 (Data-Driven Instruction) 與教育科技技術債管理思維所開發。

