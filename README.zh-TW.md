# 🕵️ Anime Character Hunter Lite（動漫角色大搜尋）

**[English](README.md) | [繁體中文](README.zh-TW.md)**

一套以「認知歷程管線」為核心、專為 K-12 設計的互動式英語文法學習工具。

本專案以 **Vue 3、TypeScript、Vite 與 Supabase** 打造，教學主題為**後位修飾（關係子句與介系詞片語）**，特別針對母語干擾（中文為前位修飾、英文為後位修飾）與結構性迷思（例如 `who she` 這類多餘代名詞）。

整體設計對應一節 45 分鐘的**國三（115 iE5 Unit 5：*The Man Who Shook Hands with Me Is My Favorite Star*）**課程。

---

## 🧠 認知歷程管線（以教學理論驅動的設計）

本工具建立在第二語言習得（SLA）理論上，包含三種獨立的題型，帶領學生完成認知循環：

```mermaid
flowchart TD
    Start((開始)) --> Preview
    
    subgraph Presentation ["1. 輸入與鷹架"]
        Preview["🔍 片語預覽<br>建立形式與意義連結"]
        Input["🎧 聽力輸入<br>測試聽覺理解"]
        Preview --> Input
    end

    Input --> Macro
    
    subgraph Practice ["2. 空間與形式"]
        Macro["🧩 巨觀拖拉<br>建立後位修飾空間感"]
        Micro["🧱 減法垃圾桶 (Trash Can)<br>視覺化文法迷思與 Gap"]
        Macro --> Micro
    end

    Micro --> Output
    
    subgraph Production ["3. 產出與反思"]
        Output["🗣️ 語音練習<br>STT 比對發音"]
        Noticing["💡 意識提升<br>自我歸納文法"]
        Output --> Noticing
    end

    Noticing --> End((完成關卡))

    %% 行為主義反饋
    Focus["⚠️ 防切屏 Beep 聲"] -.-> Practice
    Timer["⏱️ 限時壓力"] -.-> Practice
    Data["📊 即時錯誤軌跡"] -.-> Teacher((教師數據儀表板))
    Micro -.-> Data
```

1. **片語預習與測驗 (Chunk Phrase Quiz)**：學生看圖聽發音，從相似片語中選出正確的。
2. **空間建構 (Macro Drag)**：學生親手把「無文字標籤」的圖片塊拖過中線，建立英文後位修飾的空間語序感。
3. **標準題與轉換題 (Standard & Reduce)**：包含聽力輸入、聚焦形式（使用獨創的**減法垃圾桶**機制）、語音輸出與意識提升。

---

## 🏗️ 系統架構圖 (System Architecture)

本系統具備高度解耦特性，透過 **Supabase** 作為中樞，將前端 Vue 3 應用、教師端、以及外部的 AI 語音服務完美串接。

```mermaid
graph TD
    subgraph Client ["前端 (Vue 3 + TypeScript)"]
        direction TB
        AdminUI["👩‍🏫 教師備課中心<br>(TeacherAdmin.vue)"]
        StudentUI["👨‍🎓 學生學習介面<br>(App.vue)"]
        
        subgraph Composables ["核心邏輯 (Composables)"]
            Timer["⏱️ useQuizTimer<br>(絕對時間戳倒數)"]
            Focus["👁️ useFocusMonitor<br>(防切屏監控)"]
            Sound["🔊 useSound<br>(Web Audio 音效)"]
            Speech["🗣️ useSpeech<br>(跨平台語音代理)"]
            Sync["📡 useClassroomSync<br>(即時主從同步)"]
        end
    end

    subgraph Supabase ["Supabase 雲端後端"]
        DB[("PostgreSQL<br>(題庫、軌跡、課堂狀態)")]
        Storage[("Storage<br>(圖片與音檔快取)")]
        
        subgraph EdgeFunctions ["Edge Functions (Deno)"]
            Action_Proxy["teacher-action<br>(安全驗證與發送)"]
            TTS_Proxy["deepgram-tts<br>(Deepgram TTS)"]
            STT_Proxy["edge-stt<br>(Deepgram STT)"]
        end
    end

    subgraph ThirdParty ["第三方 API"]
        Deepgram["Deepgram API"]
    end

    %% 資料流
    AdminUI -- "安全驗證請求" --> Action_Proxy
    Action_Proxy -- "更新狀態" --> DB
    DB -- "Postgres Changes" --> Sync
    Sync -- "推送與同步" --> StudentUI
    
    AdminUI -- "CRUD" --> DB
    StudentUI -- "CRUD & Logs" --> DB
    
    StudentUI -- "語音合成請求" --> TTS_Proxy
    TTS_Proxy --> Deepgram
    TTS_Proxy -- "儲存快取" --> Storage
    
    StudentUI -- "語音辨識請求" --> STT_Proxy
    STT_Proxy --> Deepgram

    %% 邏輯依賴
    StudentUI -.-> Composables
    AdminUI -.-> Speech
```

---

## 🎙️ 跨平台混合式語音架構 (Hybrid TTS & STT)

為了確保在 iPad、一般電腦、以及**沒有語音包的智慧白板**上都能 100% 穩定運作，本專案實作了基於 Supabase Edge Functions 的降級備援機制。

- **文字轉語音 (TTS)**：優先偵測系統原生語音包（並隨機選擇男女聲）。若無語音包（如 Windows 白板），則自動呼叫 `deepgram-tts` 代理，取得高音質 AI 語音。
- **語音轉文字 (STT)**：完全繞過瀏覽器 Web Speech API 的限制（如 Safari 的 `service-not-allowed`），將錄音檔傳送至 `edge-stt` 代理，交由 **Deepgram** 進行精準辨識。

---

## ⚡ 即時課堂互動時序圖 (Master-Slave & Anti-Cheat)

這張圖展示了最核心的「教師安全掌控」、「靜默同步」與「學生防作弊」機制。

```mermaid
sequenceDiagram
    participant T as 👩‍🏫 老師
    participant EF as 🛡️ Edge Function
    participant DB as 🗄️ 資料庫狀態
    participant S as 👨‍🎓 學生畫面
    participant Timer as ⏱️ 計時引擎
    participant Browser as 🌐 瀏覽器 API

    Note over T,S: 情境：老師安全地推送 60 秒限時題目
    
    T->>EF: 請求發送 (附帶教師密碼)
    EF->>DB: 驗證並更新狀態 (題目 ID + 結束時間)
    DB-->>S: Postgres Changes 觸發 (WebSocket)
    S->>S: 切換題目並同步題庫
    S->>Timer: 計算剩餘絕對時間
    Timer-->>S: 顯示 60 秒倒數

    Note over S,Browser: 情境：學生試圖切換分頁偷看答案
    
    Browser->>S: 觸發 visibilitychange (分頁隱藏)
    S->>S: 播放防作弊 Beep 聲 + 顯示紅框警告
    Note right of Timer: ⚠️ 絕對時間戳持續倒數<br>切換分頁無法暫停時間
    
    Timer-->>S: 時間到！觸發 isTimeUp
    S->>S: 顯示超時阻塞遮罩
```

---

## ✨ 主要功能

### 給學生
- **減法垃圾桶 UI（Reduce 模式）**：學生一開始看到完整的關係子句，點擊多餘的詞（如 `who`, `is`）丟進垃圾桶。視覺化看著句子縮短，親眼見證文法轉換的過程。
- **片語塊視覺化**：多字片語（如 `[in a blue uniform]`）顯示為不可分割的藍色磚塊。
- **無標籤空間拼圖**：巨觀拖拉階段只顯示圖片，不顯示文字，避免洩題。
- **隨機語音輸入**：每次播放皆會從語音池中隨機選擇不同聲音，增加聽力豐富度。
- **文字比對發音面板**：透過 Deepgram 辨識發音，精準畫線標示漏讀單字。

### 給老師（Teacher Admin）
- **漏斗式出題（Funnel Authoring）**：用 `[ ]` 框出要保留的片語，系統自動視覺化「保留（綠）」與「丟棄（紅）」的字。若動詞需轉為介系詞（如 `carrying` 改 `with`），只需在綠框加上 `with`，系統會自動把新字塞進學生的字磚庫。
- **主從遠端控制**：老師可一鍵推送題目、強制重置計時器，或隨時點擊 `+30s` 為全班加時。
- **課堂節奏掌控**：可針對每題切換「自由進度」(🟢) 或「限時挑戰」(🔴)。
- **直覺干擾磚標籤**：點擊 `she`, `wear`, `which` 等標籤，快速加入迷思干擾磚。
- **全班分析儀表板**：將錯誤事件彙整成即時圖表。

---

## 🔬 診斷規則引擎

學生的錯誤會被歸類為**診斷碼**。文法規則是純函式，位於 `src/rules/grammarRules.ts`。

| 診斷碼 | 觸發情境 | 教學診斷意義 |
| :--- | :--- | :--- |
| `DUPLICATE_PRONOUN` | *who / which / that* 後面緊接主格代名詞。 | 學生尚未理解關代已代替先行詞。 |
| `SV_AGREEMENT` | 關代後的動詞與先行詞單複數不一致。 | 尚未掌握關係子句內的動詞呼應。 |
| `WRONG_RELATIVE` | 先行詞是物卻用 *who*，或人卻用 *which*。 | 無法依先行詞類型選擇關代。 |
| `NOT_REDUCED` | 轉換題中仍保留 *who / which / that*。 | 沒有把關係子句簡化為介系詞片語。 |
| `INCOMPLETE_REDUCTION` | 關代已刪除，但 be 動詞仍殘留。 | 刪了關代，卻忘了刪 be 動詞。 |
| `WRONG_ORDER` | 文法正確但字序錯誤。 | 語序錯亂或選錯連接詞。 |
| `PUZZLE_ERROR` | 拼圖塊未對準目標槽位。 | 缺乏後位修飾的空間位置感。 |

---

## 🛠️ 技術棧與工程

- **前端**：Vue 3（Composition API）+ Vite + TypeScript
- **後端與資料庫**：Supabase（PostgreSQL、Storage、Edge Functions、Realtime）
- **語音 (TTS & STT)**：Deepgram API（透過 Edge Function 代理）+ Web Speech API 降級備援
- **拖曳**：原生 Pointer Events 與 `vue-draggable-plus`

---

## 🚀 快速開始

### 環境設定
建立 `.env.local` 檔案：
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase 設定
1. 建立名為 `tts-audio` 的 **Public** Storage bucket。
2. 建立 `classroom_state` 資料表並開啟 Realtime (`supabase_realtime`)。
3. 部署 Edge Functions：
   ```bash
   npx supabase functions deploy deepgram-tts
   npx supabase functions deploy edge-stt
   npx supabase functions deploy teacher-action
   ```
4. 設定 Secrets（API 金鑰與教師密碼）：
   ```bash
   npx supabase secrets set DEEPGRAM_API_KEY=your_deepgram_key
   npx supabase secrets set TEACHER_PASSWORD=your_teacher_password
   ```

### 開發與測試
```bash
npm install
npm run dev
npm test
```

---

## 📚 教學理論參考
- 處理教學法（Processing Instruction, PI）：VanPatten (1996)
- 注意假說（Noticing Hypothesis）：Schmidt (1990)
- PACE 模型：Adair-Hauck & Donato (2002)
- 聚焦形式（Focus on Form）：Long (1991)