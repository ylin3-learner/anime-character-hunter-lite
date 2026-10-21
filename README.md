# 🕵️ Anime Character Hunter Lite

**[English](README.md) | [繁體中文](README.zh-TW.md)**

An interactive, cognitive-pipeline-driven English grammar learning tool designed for K-12 education.

Built with **Vue 3, TypeScript, Vite, and Supabase**, this application takes a pedagogical approach to teaching **Post-modifiers (Relative Clauses & Prepositional Phrases)**, specifically targeting the common L1 interference (Chinese pre-modifiers vs. English post-modifiers) and structural misconceptions (e.g., redundant pronouns like `who she`).

It is designed around a single 45-minute lesson for **Grade 9 (115 iE5, Unit 5: *The Man Who Shook Hands with Me Is My Favorite Star*)**, covering Grammar Focus 1 (prepositional phrases), Grammar Focus 2 (subject relative clauses with *who / which / that*) and the p.107 Read activity (relative clause ↔ prepositional phrase conversion).

## 🧠 The Cognitive Pipeline (Pedagogy-Driven Design)

Traditional grammar apps focus on rote memorization. This app is built upon Second Language Acquisition (SLA) theories, guiding students through a complete cognitive loop:

1. **Input Processing (Structured Input)**: Students listen to a sentence and select the correct image, forcing them to map form to meaning before production.
2. **Spatial Construction (Contrast Puzzle & Macro Drag)**: Students physically drag blocks behind the noun or drag puzzle pieces across the center line to understand syntactic positioning visually.
3. **Focus on Form (Micro Tiles)**: Students arrange word tiles. A built-in rule engine detects misconceptions (e.g., `DUPLICATE_PRONOUN`) and provides guided feedback instead of direct answers. Includes auto-generated distractor tiles (e.g., *she*, *which*).
4. **Prosody & Output**: Includes TTS (Text-to-Speech) with adjustable speed and STT (Speech-to-Text) for pronunciation practice, visualizing missed words via a text-diff algorithm.
5. **Consciousness-Raising (Noticing Board & Explanation Cards)**: Students observe examples and deduce grammar rules themselves through PACE model interactivity and self-customized explanation pop-ups.

## ✨ Key Features

### For Students
- **Center-Line Magnetic Snapping**: A visual ghost slot and center-line detection mechanic that makes puzzle assembly intuitive and rewarding.
- **Instant Guided Feedback**: Red highlighting and shake animations for grammar errors, with hints that guide students to self-correct rather than revealing the answer.
- **Audio Chimes**: Global Web Audio API sound effects for correct and incorrect actions to reinforce cognitive load.
- **Text-Diff Pronunciation Panel**: Record your voice, compare it with the target sentence, and see exactly which words were missed.

### For Teachers (Teacher Admin)
- **Zero-Code Question Builder**: Paste an image (auto-compressed) and type a sentence. The system automatically splits tiles, generates input processing data, and creates noticing board materials.
- **Cloud Sync & Offline Fallback**: Question banks are synced via Supabase (PostgreSQL) for seamless multi-device deployment, with `localStorage` acting as an offline fallback.
- **Class-wide Analytics Dashboard**: A built-in dashboard aggregates student error events (see [Diagnostic Codes](#-diagnostic-rule-engine)) into real-time bar charts, allowing teachers to instantly diagnose class-wide weaknesses.
- **Auto-Distractor Generation**: If no distractors are provided, the system automatically injects common misconception tiles (e.g., *she*, *wear*) based on the target sentence. For targeted diagnosis, set distractors manually (see [Authoring Questions](#-authoring-questions)).
- **Custom Explanation Cards**: Teachers can define the title and description of the explanation card that pops up after a correct puzzle merge.
- **Drag-and-Drop Sorting**: Easily reorder levels and difficulty progression via `vue-draggable-plus`.

## 🔬 Diagnostic Rule Engine

Student mistakes are classified into a small set of **diagnostic codes**. Each code maps to one teaching decision, so the dashboard reads directly as a class-level diagnosis. The grammar rules are pure functions (no UI or network dependencies) in `src/rules/grammarRules.ts`.

| Code | Triggered when | What it tells the teacher | Where |
|---|---|---|---|
| `DUPLICATE_PRONOUN` | A subject pronoun (*I, you, he, she, it, we, they*) directly follows *who / which / that*, e.g. `The boy who she is…` | The student does not yet see that the relative pronoun already replaces the noun. | `grammarRules.ts` |
| `SV_AGREEMENT` | The first verb after the relative pronoun disagrees with the antecedent's number, e.g. `The boys who lives…` | The student has not mastered verb agreement inside the relative clause. | `grammarRules.ts` |
| `WRONG_RELATIVE` | *who* is used for a thing, or *which* for a person (*that* is accepted for both) | The student cannot yet choose the relative pronoun by antecedent type. | `grammarRules.ts` |
| `NOT_REDUCED` | In a **reduce** (conversion) question, *who / which / that* is still present | The student did not apply the relative clause → prepositional phrase conversion. | `grammarRules.ts` |
| `INCOMPLETE_REDUCTION` | In a **reduce** question, the relative pronoun is gone but a *be* verb is left directly before a preposition, e.g. `The ball is under the chair…` | The student removed the pronoun but not the *be* verb. | `grammarRules.ts` |
| `WRONG_ORDER` | The tiles are full, no rule above fired, but the order differs from the answer | Grammar is fine but word order is off, or a wrong connector was chosen. | `MicroTileUnscramble.vue` |
| `PUZZLE_ERROR` | In the Contrast Puzzle, a piece is released without crossing the center line or hitting the target slot | The student has not yet built a spatial sense of English post-modification. | `ContrastPuzzle.vue` |

### Rule engine API

```ts
import { validatePostModifier } from './rules/grammarRules';

validatePostModifier(
  tiles,        // the student's current tile arrangement, e.g. ['The','boy','who','she','is',…]
  antecedent,   // { noun: 'boy', number: 'singular', person: 'person' }
  { mode: 'build' }   // 'build' (default) | 'reduce'
);                    // → DiagnosticSignal[] ({ code, index, message, hint })
```

- **`build` mode (default)** runs `DUPLICATE_PRONOUN`, `SV_AGREEMENT` and `WRONG_RELATIVE`.
- **`reduce` mode** is for conversion questions (relative clause → prepositional phrase). It reports `NOT_REDUCED` first; once the pronoun is gone it checks for `INCOMPLETE_REDUCTION`. Correct reduced sentences (e.g. `The ball under the chair is dirty`) return no signals.
- **The antecedent metadata is required.** `SV_AGREEMENT` needs `number` and `WRONG_RELATIVE` needs `person`; if a question lacks them, those rules cannot fire.
- **Verb coverage** is deliberately limited to Unit 5 vocabulary (`src/rules/verbTable.ts`): *is/are, was/were, has/have, wears/wear, lives/live, likes/like, plays/play, shakes/shake, stands/stand, looks/look, leads/lead, owns/own, belongs/belong*. Verbs outside the table are skipped, never guessed.

### Known limitations

- `SV_AGREEMENT` checks only the verb immediately after the relative pronoun (skipping any duplicated pronoun). Put verb-agreement distractors in that position; a wrong main verb elsewhere falls back to `WRONG_ORDER`.
- `INCOMPLETE_REDUCTION` is a heuristic: it flags a *be* verb directly followed by a preposition. Do not author conversion answers whose main verb is directly followed by a preposition (e.g. *My mom is in a long skirt*).
- Participle reductions such as *the woman wearing a long skirt* are valid English but are not accepted as answers to textbook conversion items; they will appear as `WRONG_ORDER`.
- Prepositional-phrase questions (Grammar Focus 1) currently have no dedicated diagnostic code; mistakes appear as `WRONG_ORDER`.
- Non-restrictive relative clauses (e.g. *Gina's mother, who…*) are out of scope.

## ✏️ Authoring Questions

Each question in Teacher Admin carries:

| Field | Purpose |
|---|---|
| Image | The target character/object card (auto-compressed). |
| Target sentence | Split automatically into tiles. |
| Antecedent (noun, singular/plural, person/thing) | Required by `SV_AGREEMENT` and `WRONG_RELATIVE`. |
| Distractors | Set manually for targeted diagnosis (see below). |
| Mode | `build` (default) or `reduce` for conversion questions. |
| Explanation card (optional) | Title and text shown after a correct puzzle merge. |

**Design principle: one question tests one misconception, and each distractor maps to one diagnostic code.**

| To diagnose | Use a distractor like | Example |
|---|---|---|
| Duplicated pronoun | *she / he / it* | `The boy who is looking up words is Peter.` + *she* |
| Wrong relative pronoun | *who* for things, *which* for people | `The pin which caught Ella's eye was on sale.` + *who* |
| Subject–verb agreement | The other verb form, placed right after the relative pronoun | `The boys who live next door are twins.` + *lives* |
| Incomplete conversion | *that* (reduce mode) | `The ball under the chair is dirty.` + *that* |

## 🎓 Lesson Integration (Unit 5, 45 minutes)

| Time | Stage | Role of the app |
|---|---|---|
| 0–4 min | Warm-up | Not used. |
| 4–14 min | Presentation | Teacher demonstrates one question on the projector, deliberately placing a distractor to show the red guided hint. |
| 14–24 min | Practice A | Groups (3–4 students, one device each) complete four questions, one per code: `DUPLICATE_PRONOUN`, `WRONG_RELATIVE`, `SV_AGREEMENT`, `NOT_REDUCED`. Teacher patrols with the dashboard open. Fast groups continue with spare questions. |
| 24–32 min | Practice B | Not used (paper Character Cards). Pairs read the completed sentences aloud and the listener picks the card, logging the error type shown by the app. |
| 32–37 min | Exit Ticket | Not used (paper, 3 items: pronoun choice, verb agreement, conversion). |
| 37–45 min | Wrap-up | Teacher projects the dashboard, picks the most frequent error code and gives a two-minute mini-lesson. |

If the class is behind, drop the conversion question; if ahead, assign the spare questions or move conversion items to homework.

## 🛠️ Tech Stack & Engineering

- **Framework**: Vue 3 (Composition API) + Vite + TypeScript
- **Database**: Supabase (PostgreSQL) for cloud synchronization and event logging
- **Testing**: Vitest (Test-Driven Development for core grammar rule engines)
- **Speech**: Web Speech API (Native browser TTS & STT)
- **Drag & Drop**: Native Pointer Events & `vue-draggable-plus`
- **Audio**: Native Web Audio API (Oscillator-based synthesized chimes)
- **Architecture**: 3-Layer Architecture (Pure Domain Rules -> Services -> UI Features)

```
src/rules/
  grammarRules.ts   # pure diagnostic rules + validatePostModifier()
  types.ts          # DiagnosticCode, DiagnosticSignal, Antecedent
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

The test suite covers every diagnostic code, regression cases proving that **correct answers are never flagged** (including all reduce-mode answers), and agreement checks for the textbook verbs.

### Deployment (GitHub Pages)

``` bash
npm run deploy
```

## 📚 Pedagogical References

- Processing Instruction (PI): VanPatten (1996)

- Noticing Hypothesis: Schmidt (1990)

- PACE Model: Adair-Hauck & Donato (2002)

- Focus on Form: Long (1991)

Developed with a focus on Cognitive Load Theory, Data-Driven Instruction, and Technical Debt Reduction in EdTech.
