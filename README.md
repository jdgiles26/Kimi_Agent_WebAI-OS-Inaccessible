# WebAI OS

A desktop-style operating-system shell that runs **~67 AI tools entirely in your browser** via WebGPU (with WASM fallback) — no API keys, no server-side inference, no data leaves your device.

Tools include: TL;DR Generator, Fact Checker, Bias Detector, RAG Chat, Background Remover, Image Captioning, Whisper Transcription, Text-to-Speech, Code Explainer, Story Generator, Workflow Builder, Tool Studio, Remote Access (iPhone via QR), Web Browser (with iframe proxy), and 50+ more.

Authoring is included: build your own tools in **Tool Studio**, chain steps in **Workflow Builder**, add custom HuggingFace models in **Model Garden**.

## Quick start

```bash
cd app/
npm run dev:safe
```

That handles install, port cleanup, macOS firewall, typecheck + tests, then starts Vite. Open `http://localhost:3000`.

For the impatient (skip the checks):

```bash
npm run dev:fast
```

Plain Vite if you've already set up:

```bash
npm run dev
```

## Architecture in one paragraph

A React 19 + TypeScript Vite app renders a window-managed desktop. Each tool component calls `useAIProcessor(appId)` which routes through a single `runModel()` cache in `src/lib/ai/runtime.ts`. That cache talks to `@huggingface/transformers` v4, picking WebGPU when available and falling back to WASM/ONNX when not. The Hono server (`api/boot.ts`) exposes `/api/proxy` (SSRF-protected iframe browser proxy), `/api/lan` (for the Remote Access QR), and optional tRPC for per-user persistence. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

## Repository structure

```
app/
├── src/
│   ├── apps/           # 67 tool components by category
│   ├── os/             # shell: Desktop, AppWindow, StartMenu, appRegistry
│   ├── lib/ai/         # runtime, modelGarden, format, customTools
│   ├── lib/agent/      # tools, recipe executor
│   ├── components/     # UI primitives
│   └── hooks/
├── api/                # Hono server (proxy, lan, trpc, oauth)
├── scripts/            # dev.sh, build.sh, start.sh
├── docs/               # ARCHITECTURE, DEVELOPMENT, DEPLOYMENT
└── AGENTS.md           # how AI coding agents should work here
```

## Documentation

- **[AGENTS.md](AGENTS.md)** — conventions for AI coding agents + the project's own agentic patterns (Workflow Builder, Tool Studio, recipe executor)
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how the layers fit together
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — setup, common pitfalls (firewall, iPhone, ports), adding tools/models
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — production build + deploy (Docker, nginx, env vars, security)

## Status

- **160+ tests passing** across runtime, agent executor, proxy SSRF, smoke-mount for all 67 tools
- **tsc + lint clean** on every commit
- **Production build verified** — `npm run build:gated` produces `dist/` ready to ship
- **iPhone Remote Access** working — open `Settings → Remote Access` for the QR code

## Verify before shipping

```bash
npm run verify        # typecheck + lint + tests
npm run build:gated   # full gate + production build
```

## License

See repository root.
