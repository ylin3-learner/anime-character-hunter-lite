# 🕵️ Anime Character Hunter Lite

**[English](README.md) | [繁體中文](README.zh-TW.md)**

An interactive, cognitive-pipeline-driven English grammar learning tool designed for K-12 education.

Built with **Vue 3, TypeScript, Vite, and Supabase**, this application takes a pedagogical approach to teaching **Post-modifiers (Relative Clauses & Prepositional Phrases)**, specifically targeting the common L1 interference (Chinese pre-modifiers vs. English post-modifiers), structural misconceptions (e.g., redundant pronouns like `who she`), and **Phrase Chunking**.

It is designed around a single 45-minute lesson for **Grade 9 (115 iE5, Unit 5: *The Man Who Shook Hands with Me Is My Favorite Star*)**, covering Grammar Focus 1 (prepositional phrases), Grammar Focus 2 (subject relative clauses with *who / which / that*), and the p.107 Read activity (relative clause ↔ prepositional phrase conversion).

## 🧠 The Cognitive Pipeline (Pedagogy-Driven Design)

Traditional grammar apps focus on rote memorization. This app is built upon Second Language Acquisition (SLA) theories, guiding students through a complete cognitive loop:

1. **Input Processing (Structured Input)**: Students listen to a sentence and select the correct image, forcing them to map form to meaning before production.
2. **Spatial Construction (Contrast Puzzle & Macro Drag)**: Students physically drag blocks behind the noun or drag puzzle pieces across the center line to understand syntactic positioning visually. **Phrase chunks** are introduced here as unified visual blocks.
3. **Focus on Form (Micro Tiles)**: Students arrange word tiles. A built-in rule engine detects misconceptions (e.g., `DUPLICATE_PRONOUN`) and provides guided feedback. **Multi-word phrases are rendered as unbreakable blue chunks**, and **correct answers trigger automatic TTS** to reinforce auditory memory.
4. **Prosody & Output**: Includes TTS with adjustable speed and STT for pronunciation practice, visualizing missed words via a text-diff algorithm.
5. **Consciousness-Raising (Noticing Board & Explanation Cards)**: Students observe examples and deduce grammar rules themselves. The explanation card now features a **"Reduce Animation"** to visually demonstrate how a relative clause transforms into a prepositional phrase.

## ✨ Key Features

### For Students
- **Phrase Chunking Visuals**: Multi-word units (e.g., `[in a blue uniform]`) appear as distinct blue tiles, teaching students to process language in meaningful chunks rather than isolated words.
- **Auto-TTS on Success**: Upon successfully assembling a sentence, the app automatically reads the complete sentence aloud using the Web Speech API.
- **One-Click Reduce Animation**: In the Contrast Puzzle explanation card, students can click a button to visually watch `who is wearing...` collapse into `in...`, bridging the gap between the two grammar forms.
- **Center-Line Magnetic Snapping**: A visual ghost slot and center-line detection mechanic that makes puzzle assembly intuitive and rewarding.
- **Instant Guided Feedback**: Red highlighting and shake animations for grammar errors, with hints that guide students to self-correct rather than revealing the answer.
- **Text-Diff Pronunciation Panel**: Record your voice, compare it with the target sentence, and see exactly which words were missed.

### For Teachers (Teacher Admin)
- **Zero-Code Question Builder with Chunking Syntax**: Paste an image (auto-compressed) and type a sentence. **Wrap phrases in `[ ]` to turn them into unbreakable tiles** (e.g., `who wears [a blue uniform]`).
- **Mind-Map Tagging System**: Assign tags (e.g., `穿著與顏色`, `核心動詞片語`) to each question. These tags map directly to the lesson's mind map for targeted review.
- **Custom Reduce Comparisons**: Define the final reduced sentence (e.g., `[in a blue uniform]`) to power the student-side reduction animation.
- **Cloud Sync & Offline Fallback**: Question banks are synced via Supabase (PostgreSQL) for seamless multi-device deployment, with `localStorage` acting as an offline fallback.
- **Class-wide Analytics Dashboard**: Aggregates student error events (see [Diagnostic Codes](#-diagnostic-rule-engine)) into real-time bar charts.
- **Auto-Distractor Generation**: Automatically injects common misconception tiles (e.g., *she*, *wear*) based on the target sentence.

## 🔬 Diagnostic Rule Engine

Student mistakes are classified into a small set of **diagnostic codes**. Each code maps to one teaching decision, so the dashboard reads directly as a class-level diagnosis. The grammar rules are pure functions (no UI or network dependencies) in `src/rules/grammarRules.ts`.

| Code | Triggered when | What it tells the teacher | Where |
|---|---|---|---|
| `DUPLICATE_PRONOUN` | A subject pronoun (*I, you, he, she, it, we, they*) directly follows *who / which / that*, e.g. `The boy who she is…` | The student does not yet see that the relative pronoun already replaces the noun. | `grammarRules.ts` |
| `SV_AGREEMENT` | The first verb after the relative pronoun disagrees with the antecedent's number, e.g. `The boys who lives…` | The student has not mastered verb agreement inside the relative clause. | `grammarRules.ts` |
| `WRONG_RELATIVE` | *who* is used for a thing, or *which* for a person (*that* is accepted for both) | The student cannot yet choose the relative pronoun by antecedent type. | `grammarRules.ts` |
| `NOT_REDUCED` | In a **reduce** question, *who / which / that* is still present | The student did not apply the relative clause → prepositional phrase conversion. | `grammarRules.ts` |
| `INCOMPLETE_REDUCTION` | In a **reduce** question, the relative pronoun is gone but a *be* verb is left directly before a preposition. | The student removed the pronoun but not the *be* verb. | `grammarRules.ts` |
| `WRONG_ORDER` | The tiles are full, no rule above fired, but the order differs from the answer | Grammar is fine but word order is off. | `MicroTileUnscramble.vue` |
| `PUZZLE_ERROR` | In the Contrast Puzzle, a piece is released without crossing the center line. | The student has not yet built a spatial sense of English post-modification. | `ContrastPuzzle.vue` |

### Rule engine API

```ts
import { validatePostModifier } from './rules/grammarRules';

validatePostModifier(
  tiles,        // e.g., ['The','boy','who','she','is',…] or ['The', 'boy', '[in a blue uniform]']
  antecedent,   // { noun: 'boy', number: 'singular', person: 'person' }
  { mode: 'build' }   // 'build' (default) | 'reduce'
);                    // → DiagnosticSignal[] ({ code, index, message, hint })
```

- **Chunk-safe Parsing**: The rule engine automatically strips `[` and `]` before evaluating tokens, ensuring chunked phrases do not trigger false positives.
- **`build` mode (default)** runs `DUPLICATE_PRONOUN`, `SV_AGREEMENT` and `WRONG_RELATIVE`.
- **`reduce` mode** reports `NOT_REDUCED` first; once the pronoun is gone it checks for `INCOMPLETE_REDUCTION`.

## ✏️ Authoring Questions

Each question in Teacher Admin carries:

| Field | Purpose |
|---|---|
| Image | The target character/object card (auto-compressed). |
| Target sentence | Split automatically into tiles. Wrap phrases in `[ ]` to create unbreakable chunks. |
| Antecedent (noun, singular/plural, person/thing) | Required by `SV_AGREEMENT` and `WRONG_RELATIVE`. |
| Tags | Ties the question to specific branches of the lesson mind map for analytics. |
| Distractors | Set manually for targeted diagnosis. |
| Mode | `build` (default) or `reduce` for conversion questions. |
| Explanation card | Title, description, and **Reduced Sentence** (for the one-click comparison animation). |

**Design principle: one question tests one misconception, and each distractor maps to one diagnostic code.**

| To diagnose | Use a distractor like | Example (with Chunking) |
|---|---|---|
| Duplicated pronoun | *she / he / it* | `The boy who is [looking up words] is Peter.` + *she* |
| Wrong relative pronoun | *who* for things, *which* for people | `The pin which [caught Ella's eye] was on sale.` + *who* |
| Subject–verb agreement | The other verb form, placed right after the relative pronoun | `The boys who live next door are twins.` + *lives* |
| Incomplete conversion | *that* (reduce mode) | `The ball under the chair is dirty.` + *that* |

## 🛠️ Tech Stack & Engineering

- **Framework**: Vue 3 (Composition API) + Vite + TypeScript
- **Database**: Supabase (PostgreSQL) for cloud synchronization and event logging
- **Testing**: Vitest (Test-Driven Development for core grammar rule engines, including chunk-safe parsing tests)
- **Speech**: Native Web Speech API (TTS auto-read on success & STT for pronunciation)
- **Drag & Drop**: Native Pointer Events & `vue-draggable-plus`
- **Audio**: Native Web Audio API (Oscillator-based synthesized chimes)
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

### Development

``` bash
npm install
npm run dev
```

### Testing

``` bash
npm test
```

## 📚 Pedagogical References

- Processing Instruction (PI): VanPatten (1996)
- Noticing Hypothesis: Schmidt (1990)
- PACE Model: Adair-Hauck & Donato (2002)
- Focus on Form: Long (1991)

Developed with a focus on Cognitive Load Theory, Data-Driven Instruction, Phrase Chunking, and Technical Debt Reduction in EdTech.