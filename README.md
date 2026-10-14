# sticky-chu

Always-on-top desktop pet AI companion. Frameless transparent Tauri window. Chat collapses to floating pet.

## Features

- 6 pets: Chu 🐹, Momo 🐱, Pudding 🐶, Taro 🐧, Boba 🐸, Mchi 🐰 — each with own system prompt, color
- Mini mode: 110×110 floating avatar (`toggleMini` in `src/App.tsx:70`), click to expand to 400×640 chat
- Streaming chat via Poolside OpenAI-compatible API (`BASE_URL`, `MODEL` in `src/App.tsx:18-19`)
- Frameless drag (`startDragging` in `src/App.tsx:55`), always-on-top, transparent (`src-tauri/tauri.conf.json:13-25`)
- API key + pet choice persist in localStorage (`sticky-chu-poolside-key`, `sticky-chu-pet`)
- Enter send / Shift+Enter newline, Stop button aborts stream

## Stack

Tauri v2 + React 19 + TypeScript + Vite 8. Bun as package manager.

## Prerequisites

- Bun
- Rust + Tauri v2 system deps
- Poolside API key (`https://inference.poolside.ai`)

## Run

```sh
bun install
bun run tauri dev
```

Web-only (no window controls):

```sh
bun run dev
```

## Build

```sh
bun run tauri build
```

## Setup

1. Launch app, click gear icon
2. Paste Poolside API key, Save
3. Pick pet via avatar badge in header
4. Ask anything

Model: `poolside/laguna-s-2.1`. Change in `src/App.tsx:19`.
