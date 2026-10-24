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
   - **Prosody & Output**: Features TTS (auto-read on success) and STT for pronunciation practice.
   - **Consciousness-Raising**: Explanation cards and a Noticing Board help students deduce grammar rules.

## ✨ Key Features

### For Students
- **Phrase Chunking Visuals**: Multi-word units (e.g., `[in a blue uniform]`) appear as distinct blue tiles, teaching students to process language in meaningful chunks.
- **Auto-TTS**: The app automatically reads complete sentences aloud upon successful assembly using the Web Speech API.
- **Instant Guided Feedback**: Red highlighting and shake animations for grammar errors, with hints that guide self-correction.
- **Center-Line Magnetic Snapping**: Intuitive puzzle assembly for spatial understanding.
- **Text-Diff Pronunciation Panel**: Record your voice, compare it with the target sentence, and see exactly which words were missed.

### For Teachers (Teacher Admin)
- **Three Distinct Question Types**: 
  - **Standard**: Full pipeline (Input, Macro, Micro, Pronunciation, Noticing).
  - **Contrast**: Purely spatial puzzle (with optional Pronunciation practice).
  - **Chunk**: Standalone phrase preview and micro-quiz.
- **Zero-Code Question Builder with Chunking Syntax**: Wrap phrases in `[ ]` to turn them into unbreakable tiles.
- **Custom Image Labels & Distractors**: Upload a correct image and a distractor image (e.g., a cat), and define the text shown beneath each.
- **Smart TTS Audio Generation**: If a teacher fills in the "Cloze Context" (e.g., *The boy* / *is Peter*), the system automatically stitches it into the TTS audio text. If left blank, it falls back to the default *is my favorite*.
- **Cloud Sync & Offline Fallback**: Synced via Supabase, with `localStorage` acting as a fallback.
- **Class-wide Analytics Dashboard**: Aggregates student error events into real-time bar charts.

## 🔬 Diagnostic Rule Engine

Student mistakes in the `Standard` question type are classified into **diagnostic codes**. The grammar rules are pure functions in `src/rules/grammarRules.ts`.

| Code | Triggered when | What it tells the teacher |
|---|---|---|
| `DUPLICATE_PRONOUN` | A subject pronoun follows *who / which / that*, e.g. `The boy who she is…` | The student does not see that the relative pronoun already replaces the noun. |
| `SV_AGREEMENT` | The verb after the relative pronoun disagrees with the antecedent. | The student has not mastered verb agreement inside the relative clause. |
| `WRONG_RELATIVE` | *who* is used for a thing, or *which* for a person. | The student cannot choose the relative pronoun by antecedent type. |
| `NOT_REDUCED` | In a **reduce** question, the relative pronoun is still present. | The student did not apply the conversion. |
| `INCOMPLETE_REDUCTION` | In a **reduce** question, the pronoun is gone but a *be* verb is left. | The student removed the pronoun but not the *be* verb. |
| `WRONG_ORDER` | No rule above fired, but the tile order differs from the answer. | Grammar is fine but word order is off. |
| `PUZZLE_ERROR` | In the Contrast Puzzle, a piece is released without hitting the target slot. | The student has not yet built a spatial sense of post-modification. |

### Rule engine API

```ts
import { validatePostModifier } from './rules/grammarRules';

validatePostModifier(
  tiles,        // e.g., ['The','boy','who','she','is',…] or ['The', 'boy', '[in a blue uniform]']
  antecedent,   // { noun: 'boy', number: 'singular', person: 'person' }
  { mode: 'build' }   // 'build' (default) | 'reduce'
);                    // → DiagnosticSignal[] ({ code, index, message, hint })
```

- **Chunk-safe Parsing**: The engine strips `[` and `]` before evaluating tokens.
- **`build` mode (default)** runs `DUPLICATE_PRONOUN`, `SV_AGREEMENT` and `WRONG_RELATIVE`.
- **`reduce` mode** reports `NOT_REDUCED` first; once the pronoun is gone it checks for `INCOMPLETE_REDUCTION`.

## ✏️ Authoring Questions

Each question type in the Teacher Admin carries distinct fields:

| Field | Standard | Contrast | Chunk | Purpose |
|---|---|---|---|---|
| Target Noun | ✅ | ✅ | ✅ | E.g., `The girl`. |
| Correct Image | ✅ | ✅ (Noun) | ✅ | Auto-compressed. |
| Distractor Image| ✅ | ❌ | ❌ | Optional. For the listening test. |
| Image Labels | ✅ | ❌ | ❌ | Text shown below the correct/distractor images. |
| Relative Clause| ✅ | ✅ | ✅ | Wrap target phrases in `[ ]` (e.g., `who wears [a blue uniform]`). |
| Cloze Context | ✅ | ❌ | ❌ | Prefix & suffix to build the TTS audio text. |
| Modifier Image | ❌ | ✅ | ❌ | The puzzle piece for the modifier. |
| Quiz Options | ❌ | ❌ | ✅ | Distractor phrases for the chunk micro-quiz (e.g., `looking for his pen`). |
| Tags | ✅ | ✅ | ✅ | Mind-map linking for analytics. |
| Mode | ✅ (Build/Reduce) | ❌ | ❌ | Toggles the reduce diagnostic rules. |

**Design principle: one question tests one misconception, and each distractor maps to one diagnostic code.**

## 🛠️ Tech Stack & Engineering

- **Framework**: Vue 3 (Composition API) + Vite + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest
- **Speech**: Web Speech API (TTS & STT)
- **Drag & Drop**: Native Pointer Events & `vue-draggable-plus`
- **Audio**: Native Web Audio API
- **Architecture**: 3-Layer Architecture (Pure Domain Rules -> Services -> UI Features)

```
src/rules/
  grammarRules.ts   # pure diagnostic rules + validatePostModifier() (chunk-safe)
  types.ts          # Unified QuestionData, DiagnosticCode, Antecedent
  verbTable.ts      # singular/plural verb pairs for Unit 5
tests/
  grammarRules.test.ts
```

## 🚀 Getting Started

### Environment Setup
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development & Testing

```bash
npm install
npm run dev
npm test
```

## 📚 Pedagogical References

- Processing Instruction (PI): VanPatten (1996)
- Noticing Hypothesis: Schmidt (1990)
- PACE Model: Adair-Hauck & Donato (2002)
- Focus on Form: Long (1991)

Developed with a focus on Cognitive Load Theory, Data-Driven Instruction, Phrase Chunking, and Technical Debt Reduction in EdTech.
