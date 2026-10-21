# 🕵️ Anime Character Hunter Lite（動漫角色大搜尋）

**[English](README.md) | [繁體中文](README.zh-TW.md)**

一套以「認知歷程管線」為核心、專為 K-12 設計的互動式英語文法學習工具。

本專案以 **Vue 3、TypeScript、Vite 與 Supabase** 打造，教學主題為**後位修飾（關係子句與介系詞片語）**，特別針對母語干擾（中文為前位修飾、英文為後位修飾）與結構性迷思（例如 `who she` 這類多餘代名詞）。

整體設計對應一節 45 分鐘的**國三（115 iE5 Unit 5：*The Man Who Shook Hands with Me Is My Favorite Star*）**課程，涵蓋 Grammar Focus 1（介系詞片語）、Grammar Focus 2（以 *who / which / that* 引導的主詞關係子句），以及 p.107 Read 活動（關係子句 ↔ 介系詞片語轉換）。

## 🧠 認知歷程管線（以教學理論驅動的設計）

傳統文法 App 偏重機械式記憶。本工具建立在第二語言習得（SLA）理論上，帶領學生完成一個完整的認知循環：

1. **輸入處理（結構化輸入）**：學生聽一個句子並選出正確圖片，在產出之前先強迫自己把形式對應到意義。
2. **空間建構（對比拼圖與 Macro Drag）**：學生親手把圖塊拖到名詞後方，或把拼圖塊拖過中線，用視覺理解句法位置。
3. **聚焦形式（Micro Tiles 字磚）**：學生排列單字磚。內建規則引擎會偵測迷思（如 `DUPLICATE_PRONOUN`），並給予引導式回饋而不是直接給答案。系統會自動產生干擾磚（如 *she*、*which*）。
4. **韻律與口語輸出**：提供語速可調的 TTS（文字轉語音）與用於發音練習的 STT（語音轉文字），並以文字比對（text-diff）演算法標示漏讀的單字。
5. **意識提升（Noticing Board 與解說卡）**：學生觀察例句，透過 PACE 模型的互動與自訂解說彈窗，自己歸納文法規則。

## ✨ 主要功能

### 給學生
- **中線磁吸**：以視覺化的虛位格與中線偵測機制，讓拼圖組裝直覺又有成就感。
- **即時引導式回饋**：文法錯誤時以紅字標示並搖晃，提示引導學生自行修正，而不是直接揭曉答案。
- **音效提示**：全域 Web Audio API 音效，回應答對與答錯，強化學習回饋。
- **文字比對發音面板**：錄下自己的聲音並與目標句比對，清楚看到漏讀了哪些字。

### 給老師（Teacher Admin）
- **免寫程式的出題器**：貼上圖片（自動壓縮）並輸入句子，系統會自動切分字磚、產生輸入處理資料，並建立 Noticing Board 教材。
- **雲端同步與離線備援**：題庫透過 Supabase（PostgreSQL）同步，方便多裝置部署；離線時以 `localStorage` 作為備援。
- **全班分析儀表板**：內建儀表板將學生的錯誤事件（參見[診斷碼](#-診斷規則引擎)）彙整成即時長條圖，讓老師立刻看出全班的弱點。
- **自動產生干擾磚**：未指定干擾磚時，系統會依目標句自動加入常見迷思磚（如 *she*、*wear*）。若要精準診斷，請手動設定干擾磚（參見[出題指引](#-出題指引)）。
- **自訂解說卡**：老師可自訂拼圖拼對後跳出的解說卡標題與內容。
- **拖曳排序**：以 `vue-draggable-plus` 輕鬆調整關卡順序與難度進程。

## 🔬 診斷規則引擎

學生的錯誤會被歸類為少數幾個**診斷碼**。每個診斷碼對應一個教學決策，所以儀表板的數字可以直接讀成全班診斷。文法規則是純函式（不依賴 UI 或網路），位於 `src/rules/grammarRules.ts`。

| 診斷碼 | 觸發情境 | 教學診斷意義 | 位置 |
|---|---|---|---|
| `DUPLICATE_PRONOUN` | *who / which / that* 後面緊接主格代名詞（*I, you, he, she, it, we, they*），例如 `The boy who she is…` | 學生尚未理解關代已代替了先行詞。 | `grammarRules.ts` |
| `SV_AGREEMENT` | 關代後的第一個動詞與先行詞單複數不一致，例如 `The boys who lives…` | 學生尚未掌握關係子句內的動詞呼應。 | `grammarRules.ts` |
| `WRONG_RELATIVE` | 先行詞是物卻用 *who*，或先行詞是人卻用 *which*（*that* 兩者皆可） | 學生還無法依先行詞的人／物來選擇關代。 | `grammarRules.ts` |
| `NOT_REDUCED` | 在 **reduce**（轉換）題中，答案仍保留 *who / which / that* | 學生沒有把關係子句簡化為介系詞片語。 | `grammarRules.ts` |
| `INCOMPLETE_REDUCTION` | 在 **reduce** 題中，關代已刪除，但 be 動詞仍緊接在介系詞前，例如 `The ball is under the chair…` | 學生刪了關代，卻忘了一併刪除 be 動詞。 | `grammarRules.ts` |
| `WRONG_ORDER` | 字磚排滿、上述規則皆未觸發，但字序與答案不同 | 文法正確但語序錯亂，或選錯了連接詞。 | `MicroTileUnscramble.vue` |
| `PUZZLE_ERROR` | 在對比拼圖中，拼圖塊未跨過中線或未對準目標槽位就放開 | 學生尚未建立英文後位修飾的空間位置感。 | `ContrastPuzzle.vue` |

### 規則引擎 API

```ts
import { validatePostModifier } from './rules/grammarRules';

validatePostModifier(
  tiles,        // 學生目前的字磚排列，例如 ['The','boy','who','she','is',…]
  antecedent,   // { noun: 'boy', number: 'singular', person: 'person' }
  { mode: 'build' }   // 'build'（預設）| 'reduce'
);                    // → DiagnosticSignal[]（{ code, index, message, hint }）
```

- **`build` 模式（預設）**執行 `DUPLICATE_PRONOUN`、`SV_AGREEMENT` 與 `WRONG_RELATIVE`。
- **`reduce` 模式**用於轉換題（關係子句 → 介系詞片語）。先回報 `NOT_REDUCED`；關代拿掉之後再檢查 `INCOMPLETE_REDUCTION`。正確的簡化句（例如 `The ball under the chair is dirty`）不會產生任何訊號。
- **必須提供先行詞資訊。** `SV_AGREEMENT` 需要 `number`，`WRONG_RELATIVE` 需要 `person`；題目缺少這些資料時，對應規則無法觸發。
- **動詞涵蓋範圍**刻意限定於 Unit 5 的詞彙（`src/rules/verbTable.ts`）：*is/are、was/were、has/have、wears/wear、lives/live、likes/like、plays/play、shakes/shake、stands/stand、looks/look、leads/lead、owns/own、belongs/belong*。表外的動詞會直接略過，絕不猜測。

### 已知限制

- `SV_AGREEMENT` 只檢查關代後緊接的那個動詞（會略過重複出現的代名詞）。動詞呼應的干擾磚請放在這個位置；其他位置的主動詞錯誤會落入 `WRONG_ORDER`。
- `INCOMPLETE_REDUCTION` 是啟發式判斷：只標記「be 動詞後面直接接介系詞」的情況。請不要出主要動詞後面直接接介系詞的轉換題答案（例如 *My mom is in a long skirt*）。
- 分詞簡化（如 *the woman wearing a long skirt*）在英文中是正確的，但不被當成課本轉換題的答案，會顯示為 `WRONG_ORDER`。
- 介系詞片語題（Grammar Focus 1）目前沒有專屬診斷碼，錯誤會顯示為 `WRONG_ORDER`。
- 非限定關係子句（如 *Gina's mother, who…*）不在範圍內。

## ✏️ 出題指引

Teacher Admin 中的每一道題目包含：

| 欄位 | 用途 |
|---|---|
| 圖片 | 目標角色／物品卡（自動壓縮）。 |
| 目標句 | 自動切分成字磚。 |
| 先行詞（名詞、單數／複數、人／物） | `SV_AGREEMENT` 與 `WRONG_RELATIVE` 必需。 |
| 干擾磚 | 為了精準診斷，請手動設定（見下表）。 |
| 模式 | `build`（預設），轉換題使用 `reduce`。 |
| 解說卡（選填） | 拼圖拼對後顯示的標題與說明。 |

**設計原則：一題只測一種迷思，每個干擾磚對應一個診斷碼。**

| 想診斷的錯誤 | 建議干擾磚 | 範例 |
|---|---|---|
| 重複代名詞 | *she / he / it* | `The boy who is looking up words is Peter.` + *she* |
| 關代選擇錯誤 | 物用 *who*、人用 *which* | `The pin which caught Ella's eye was on sale.` + *who* |
| 主詞動詞一致 | 放在關代後面的另一種動詞形式 | `The boys who live next door are twins.` + *lives* |
| 轉換不完整 | *that*（reduce 模式） | `The ball under the chair is dirty.` + *that* |

## 🎓 課堂整合（Unit 5，45 分鐘）

| 時間 | 階段 | App 的角色 |
|---|---|---|
| 0–4 分鐘 | Warm-up | 不使用。 |
| 4–14 分鐘 | Presentation | 老師用投影示範一題，故意放入干擾磚，讓學生看到紅字引導提示。 |
| 14–24 分鐘 | Practice A | 分組（每組 3–4 人、一台裝置）完成四題，各對應一個診斷碼：`DUPLICATE_PRONOUN`、`WRONG_RELATIVE`、`SV_AGREEMENT`、`NOT_REDUCED`。老師巡場並開啟儀表板；先完成的組別繼續做備用題。 |
| 24–32 分鐘 | Practice B | 不使用（以紙本角色卡進行）。兩人一組，朗讀剛完成的句子，聽者指出角色卡，並記錄 App 提示過的錯誤類型。 |
| 32–37 分鐘 | Exit Ticket | 不使用（紙本，3 題：關代選擇、動詞一致、轉換）。 |
| 37–45 分鐘 | Wrap-up | 老師投影儀表板，找出出現最多的診斷碼，用兩分鐘做小講解。 |

進度落後時刪除轉換題；進度超前時指派備用題，或把轉換題改列為課後作業。

## 🛠️ 技術棧與工程

- **框架**：Vue 3（Composition API）+ Vite + TypeScript
- **資料庫**：Supabase（PostgreSQL），用於雲端同步與事件紀錄
- **測試**：Vitest（核心文法規則引擎採測試驅動開發）
- **語音**：Web Speech API（瀏覽器原生 TTS 與 STT）
- **拖曳**：原生 Pointer Events 與 `vue-draggable-plus`
- **音效**：原生 Web Audio API（以振盪器合成的提示音）
- **架構**：三層式架構（純領域規則 -> 服務 -> UI 功能）

```
src/rules/
  grammarRules.ts   # 純函式診斷規則 + validatePostModifier()
  types.ts          # DiagnosticCode、DiagnosticSignal、Antecedent
  verbTable.ts      # Unit 5 的單複數動詞對照
tests/
  grammarRules.test.ts
```

## 🚀 快速開始

### 環境設定
在專案根目錄建立 `.env.local` 檔案，並填入你的 Supabase 憑證：
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 開發

``` bash
npm install
npm run dev
```

### 測試

``` bash
npm test
```

測試涵蓋每一個診斷碼，並包含迴歸測試，確保**正確答案絕不會被誤報**（包含所有 reduce 模式的正解），以及課本動詞的單複數呼應檢查。

### 部署（GitHub Pages）

``` bash
npm run deploy
```

## 📚 教學理論參考

- 處理教學法（Processing Instruction, PI）：VanPatten (1996)

- 注意假說（Noticing Hypothesis）：Schmidt (1990)

- PACE 模型：Adair-Hauck & Donato (2002)

- 聚焦形式（Focus on Form）：Long (1991)

本專案著重於認知負荷理論、數據驅動教學，以及教育科技中的技術債削減。
