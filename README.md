# 🕵️ Anime Character Hunter Lite

**[English](README.md) | [繁體中文](README.zh-TW.md)**

An interactive, cognitive-pipeline-driven English grammar learning tool designed for K-12 education. 

Built with **Vue 3, TypeScript, and Vite**, this application takes a pedagogical approach to teaching **Post-modifiers (Relative Clauses & Prepositional Phrases)**, specifically targeting the common L1 interference (Chinese pre-modifiers vs. English post-modifiers) and structural misconceptions (e.g., redundant pronouns like `who she`).

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
- **Instant Guided Feedback**: Red highlighting and shake animations for grammar errors, with prompts to self-correct.
- **Audio Chimes**: Global Web Audio API sound effects for correct and incorrect actions to reinforce cognitive load.
- **Text-Diff Pronunciation Panel**: Record your voice, compare it with the target sentence, and see exactly which words were missed.

### For Teachers (Teacher Admin)
- **Zero-Code Question Builder**: Paste an image (auto-compressed) and type a sentence. The system automatically splits tiles, generates input processing data, and creates noticing board materials.
- **Auto-Distractor Generation**: If no distractors are provided, the system automatically injects common misconception tiles (e.g., *she*, *wear*) based on the target sentence.
- **Custom Explanation Cards**: Teachers can define the title and description of the explanation card that pops up after a correct puzzle merge.
- **Drag-and-Drop Sorting**: Easily reorder levels and difficulty progression via `vue-draggable-plus`.
- **Local-First**: All custom questions are saved securely in the browser's `localStorage` (no backend needed).

## 🛠️ Tech Stack & Engineering

- **Framework**: Vue 3 (Composition API) + Vite + TypeScript
- **Testing**: Vitest (Test-Driven Development for core grammar rule engines)
- **Speech**: Web Speech API (Native browser TTS & STT)
- **Drag & Drop**: Native Pointer Events & `vue-draggable-plus`
- **Audio**: Native Web Audio API (Oscillator-based synthesized chimes)
- **Architecture**: 3-Layer Architecture (Pure Domain Rules -> Services -> UI Features)

## 🚀 Getting Started

### Development

```bash
npm install
npm run dev
```

### Testing

``` bash
npm test
```


### Deployment (GitHub Pages)

``` bash
npm run deploy
```

📚 Pedagogical References

- Processing Instruction (PI): VanPatten (1996)

- Noticing Hypothesis: Schmidt (1990)

- PACE Model: Adair-Hauck & Donato (2002)

- Focus on Form: Long (1991)

Developed with a focus on Cognitive Load Theory and Technical Debt Reduction in EdTech.