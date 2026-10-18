# 🕵️ Anime Character Hunter Lite

**[English](README.md) | [繁體中文](README.zh-TW.md)**

An interactive, cognitive-pipeline-driven English grammar learning tool designed for K-12 education. 

Built with **Vue 3, TypeScript, and Vite**, this application takes a pedagogical approach to teaching **Post-modifiers (Relative Clauses & Prepositional Phrases)**, specifically targeting the common L1 interference (Chinese pre-modifiers vs. English post-modifiers) and structural misconceptions (e.g., redundant pronouns like `who she`).

## 🧠 The Cognitive Pipeline (Pedagogy-Driven Design)

Traditional grammar apps focus on rote memorization. This app is built upon Second Language Acquisition (SLA) theories, guiding students through a complete cognitive loop:

1. **Input Processing (Structured Input)**: Students listen to a sentence and select the correct image, forcing them to map form to meaning before production.
2. **Spatial Construction (Macro Drag)**: Students physically drag a character block *behind* the noun, breaking the Chinese pre-modifier habit.
3. **Focus on Form (Micro Tiles)**: Students arrange word tiles. A built-in rule engine detects misconceptions (e.g., `DUPLICATE_PRONOUN`, `SV_AGREEMENT`) and provides guided feedback instead of direct answers.
4. **Prosody & Output**: Includes TTS (Text-to-Speech) with adjustable speed and STT (Speech-to-Text) for pronunciation practice, visualizing missed words via a text-diff algorithm.
5. **Consciousness-Raising (Noticing Board)**: Based on the PACE model, students observe examples and deduce grammar rules themselves rather than being told.

## ✨ Key Features

### For Students
- **Contrast Puzzle**: A draggable puzzle piece to physically merge the modifier with the noun, visually demonstrating the difference between Chinese and English word order.
- **Instant Guided Feedback**: Red highlighting and shakes for grammar errors, with prompts to self-correct.
- **Text-Diff Pronunciation Panel**: Record your voice, compare it with the target sentence, and see exactly which words were missed.

### For Teachers (Teacher Admin)
- **Zero-Code Question Builder**: Paste an image (auto-compressed) and type a sentence. The system automatically generates tiles, input processing data, and noticing board materials.
- **Drag-and-Drop Sorting**: Easily reorder levels and difficulty progression.
- **Local-First**: All custom questions are saved securely in the browser's `localStorage` (no backend needed).

## 🛠️ Tech Stack & Engineering

- **Framework**: Vue 3 (Composition API) + Vite + TypeScript
- **Testing**: Vitest (Test-Driven Development for core grammar rule engines)
- **Speech**: Web Speech API (Native browser TTS & STT)
- **Drag & Drop**: Native Pointer Events & `vue-draggable-plus`
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

### Deployment

#### Deployed via GitHub Pages:

``` bash
npm run deploy
```

📚 Pedagogical References

- Processing Instruction (PI): VanPatten (1996)

- Noticing Hypothesis: Schmidt (1990)

- PACE Model: Adair-Hauck & Donato (2002)

- Focus on Form: Long (1991)

Developed with a focus on Cognitive Load Theory and Technical Debt Reduction in EdTech.