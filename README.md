# 🕵️ Anime Character Hunter Lite

**[English](README.md) | [繁體中文](README.zh-TW.md)**

An interactive, cognitive-pipeline-driven English grammar learning tool designed for K-12 education.

Built with **Vue 3, TypeScript, Vite, and Supabase**, this application takes a pedagogical approach to teaching **Post-modifiers (Relative Clauses & Prepositional Phrases)**, specifically targeting the common L1 interference (Chinese pre-modifiers vs. English post-modifiers), structural misconceptions (e.g., redundant pronouns like `who she`), and **Phrase Chunking**.

It is designed around a single 45-minute lesson for **Grade 9 (115 iE5, Unit 5: *The Man Who Shook Hands with Me Is My Favorite Star*)**, covering Grammar Focus 1 (prepositional phrases), Grammar Focus 2 (subject relative clauses with *who / which / that*), and the p.107 Read activity.

## 🧠 The Cognitive Pipeline (Pedagogy-Driven Design)

This app is built upon Second Language Acquisition (SLA) theories and features **three distinct question types**, each guiding students through a specific cognitive loop:

1. **Chunk Phrase Quiz (Lexical Chunking)**: 
   - Students see an image, listen to a target phrase, and must select the correct chunk from visually similar distractors (e.g., `looking up words` vs. `looking for his pen`). This establishes **Form-Meaning Mapping** before full sentence production.
2. **Contrast Puzzle (Spatial Construction)**: 
   - Students physically drag puzzle pieces across the center line. This step isolates the syntax from vocabulary, helping students build a spatial sense of English post-modification (Modifier goes *after* the noun).
3. **Standard Question (Input, Form, & Output)**: 
   - **Input Processing**: Students listen to a sentence and select the correct image.
   - **Focus on Form**: Students arrange word tiles. Multi-word phrases are unbreakable blue chunks. The built-in rule engine detects misconceptions.
   - **Prosody & Output**: Features a **Hybrid Speech Architecture** for TTS and STT (detailed below).
   - **Consciousness-Raising**: Explanation cards and a Noticing Board help students deduce grammar rules.

## 🎙️ Hybrid Speech Architecture (Cross-Platform TTS & STT)

To ensure 100% stability across all devices (iPads, computers, and smart whiteboards with no system voice packs), this app implements a robust **fallback mechanism** powered by Supabase Edge Functions.

``` mermaid
graph TD
    subgraph Frontend ["Frontend (Vue 3)"]
        TTS_Req["TTS Request (Text + Rate)"]
        TTS_Check{"System Voices\nAvailable?"}
        NativeTTS["Native Web Speech API\n(Random Voice)"]
        EdgeTTS_API["Fetch from Supabase Edge Function"]
        
        STT_Req["STT Request (Audio Blob)"]
        STT_API["Fetch from Supabase Edge Function"]
    end

    subgraph Supabase ["Supabase Edge Functions & Storage"]
        Edge_TTS["edge-tts (Deno)"]
        Cache{"Check Storage\n(md5 hash)"}
        MS_TTS["Microsoft Edge TTS API\n(Neural Voices)"]
        Storage[("Supabase Storage\n(tts-audio bucket)")]
        
        Edge_STT["edge-stt (Deno)"]
    end

    subgraph ThirdParty ["Third-Party API"]
        Deepgram["Deepgram STT API"]
    end

    %% TTS Flow
    TTS_Req --> TTS_Check
    TTS_Check -- Yes --> NativeTTS
    TTS_Check -- No (e.g., Smart Whiteboard) --> EdgeTTS_API
    EdgeTTS_API --> Edge_TTS
    Edge_TTS --> Cache
    Cache -- Found (Fast) --> Storage
    Cache -- Not Found --> MS_TTS
    MS_TTS --> Edge_TTS
    Edge_TTS --> Storage
    
    %% STT Flow
    STT_Req --> STT_API
    STT_API --> Edge_STT
    Edge_STT --> Deepgram
```

- **TTS (Text-to-Speech)**: Detects if the device has system voices. If yes, it randomly selects a native English voice. If no (common on Windows smart whiteboards), it routes to a Supabase Edge Function that generates high-quality neural audio via Microsoft Edge TTS and caches the .mp3 in Supabase Storage using an MD5 hash.

- **STT (Speech-to-Text)**: Bypasses browser-specific API restrictions (like service-not-allowed on Safari) by recording audio and securely sending it through a Supabase Edge Function to Deepgram for highly accurate transcription.

# ✨ Key Features

## For Students

- **Phrase Chunking Visuals**: Multi-word units (e.g., [in a blue uniform]) appear as distinct blue tiles.

- **Randomized Audio**: TTS randomly selects from a pool of voices to provide varied auditory input.

- **Instant Guided Feedback**: Red highlighting and shake animations for grammar errors.

- **Text-Diff Pronunciation Panel**: Record your voice via Deepgram STT, compare it with the target sentence, and see exactly which words were missed. Includes graceful degradation (manual playback) if network fails.

## For Teachers (Teacher Admin)

- **Three Distinct Question Types**: Standard, Contrast, Chunk.

- **Zero-Code Question Builder with Chunking Syntax**: Wrap phrases in [ ] to turn them into unbreakable tiles.

- **Smart TTS Audio Generation**: Automatically stitches cloze contexts and supports adjustable speech rates (0.5, 0.8, 1.0).

- **Class-wide Analytics Dashboard**: Aggregates student error events into real-time bar charts.

# 🔬 Diagnostic Rule Engine

Student mistakes are classified into **diagnostic codes**. The grammar rules are pure functions in `src/rules/grammarRules.ts`.

| Code                   | Triggered when                                                   | What it tells the teacher                                       |
| ---------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `DUPLICATE_PRONOUN`    | A subject pronoun follows _who / which / that_.                  | The student doesn't see the relative pronoun replaces the noun. |
| `SV_AGREEMENT`         | The verb disagrees with the antecedent's number.                 | The student hasn't mastered verb agreement.                     |
| `WRONG_RELATIVE`       | _who_ for a thing, or _which_ for a person.                      | The student can't choose the pronoun by antecedent type.        |
| `NOT_REDUCED`          | In a **reduce** question, the relative pronoun is still present. | The student didn't apply the conversion.                        |
| `INCOMPLETE_REDUCTION` | The pronoun is gone but a _be_ verb is left.                     | The student removed the pronoun but not the _be_ verb.          |
| `WRONG_ORDER`          | Grammar is fine but tile order differs.                          | Word order is off.                                              |
| `PUZZLE_ERROR`         | Puzzle piece misses the target slot.                             | Lacks spatial sense of post-modification.                       |

🛠️ Tech Stack & Engineering

- Frontend: Vue 3 (Composition API) + Vite + TypeScript

- Backend & DB: Supabase (PostgreSQL, Storage, Edge Functions)

- Speech (TTS): Native Web Speech API + Microsoft Edge TTS (via Edge Function fallback)

- Speech (STT): Deepgram API (via Edge Function proxy)

- Drag & Drop: Native Pointer Events & vue-draggable-plus

# 🚀 Getting Started

## Environment Setup
Create a .env.local file:

``` bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup
- Create a Public Storage bucket named tts-audio.

## Deploy the Edge Functions:

``` bash
npx supabase functions deploy edge-tts
npx supabase functions deploy edge-stt
```

## Set the Deepgram API Key in Supabase Secrets:

``` bash
npx supabase secrets set DEEPGRAM_API_KEY=your_deepgram_key
```

## Development & Testing

``` bash
npm install
npm run dev
npm test
```

📚 Pedagogical References

- Processing Instruction (PI): VanPatten (1996)

- Noticing Hypothesis: Schmidt (1990)

- PACE Model: Adair-Hauck & Donato (2002)

- Focus on Form: Long (1991)