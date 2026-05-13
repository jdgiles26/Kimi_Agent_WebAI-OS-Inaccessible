# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Aider, etc.) working in this repo,
and a reference for the project's own *runtime* agentic patterns (Workflow Builder,
Tool Studio, the recipe executor).

---

## Part 1 — How AI coding agents should work in this repo

### Project shape

- **Frontend**: React 19 + TypeScript + Vite 7 desktop-OS shell that renders ~67 in-browser AI tools as windowed apps.
- **Inference**: `@huggingface/transformers` v4 with WebGPU → WASM fallback. All inference is in-browser; no server-side model calls.
- **Server**: Hono mounted via `@hono/vite-dev-server` in dev, `@hono/node-server` in prod. Routes: `/api/trpc/*`, `/api/proxy`, `/api/lan`, OAuth callback.
- **Storage**: IndexedDB client-side (custom tools, notes, files, recipes); Drizzle + MySQL server-side (users, notes — *do not modify the SQL schema or migrations*).
- **Tests**: Vitest, 160+ tests, two projects (`api` node env, `ui` jsdom env). `fake-indexeddb` for tests.

### Hard rules

1. **Never claim a task is done without running it.**
   - `npm run verify` is the single source of truth (typecheck + lint + tests).
   - If you change runtime/server code, also run `npm run build`.
   - For UI changes you can't browser-verify, say so explicitly. Don't pretend tests cover UX.

2. **Do not touch:**
   - `db/`, `drizzle.config.ts`
   - `api/router.ts`, `api/trpc/*`, `api/context.ts`
   - `api/kimi/*` beyond the documented lazy-init pattern in `auth.ts`
   - The MySQL schema (`db/schema.ts`)

3. **TDD by default.** A bug fix without a failing test that pins the behavior is incomplete.

4. **No new dependencies** unless the user explicitly asks. Justify any addition in the PR description.

5. **No backwards-compat shims.** This is not a published library — change call sites instead of carrying dead aliases.

6. **No defensive theater.** Don't add try/catch around things that can't throw, validation for inputs from internal callers, or `?.` chains on values typed as non-nullable. Trust the types.

7. **Brevity in comments.** Default to none. Only write a comment when the *why* is non-obvious (a hidden constraint, a subtle invariant, a workaround for a known bug). Never narrate what the code does.

### Layout

```
app/
├── api/                    # Hono server, tRPC, proxy, LAN, OAuth
│   ├── boot.ts             # Entry — registers all routes
│   ├── proxy/              # WebBrowser iframe proxy (SSRF-protected)
│   ├── lan/                # LAN address enumeration for Remote Access QR
│   ├── kimi/auth.ts        # OAuth + JWKS (lazy-init pattern)
│   └── trpc/               # tRPC routers (untouchable)
├── contracts/              # Shared types between server + client
├── db/                     # Drizzle schema, migrations (untouchable)
├── src/
│   ├── apps/               # 67 tool components, grouped by category
│   │   ├── _shared/        # ImageWorkbench, AudioWorkbench
│   │   ├── AppLayout.tsx   # The useAIProcessor seam — wraps every tool
│   │   └── system/         # ModelGarden, ToolStudio, WorkflowBuilder, RemoteAccess, etc.
│   ├── components/         # shadcn + project UI primitives
│   ├── hooks/              # useModelRuntime, useWebGPU, useNotes, ...
│   ├── lib/
│   │   ├── ai/             # runtime.ts, modelGarden.ts, toolModelMap.ts, format.ts, customTools.ts
│   │   ├── agent/          # tools.ts, executor.ts — the recipe runner
│   │   └── storage/db.ts   # IndexedDB wrapper
│   ├── os/                 # AppWindow, Desktop, StartMenu, Taskbar, ErrorBoundary, appRegistry.tsx
│   └── types/os.ts
├── scripts/
│   ├── dev.sh              # First-run + dev launcher (firewall + ports + checks)
│   ├── build.sh            # Gated prod build
│   └── start.sh            # Prod server launcher
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── DEPLOYMENT.md
└── package.json
```

### Key seams to understand before editing

| File | What it does | Why it matters |
| --- | --- | --- |
| `src/lib/ai/runtime.ts` | Pipeline cache, WebGPU/WASM fallback, abort plumbing, snapshot store | Every tool depends on this. Snapshot reference stability is load-bearing for `useSyncExternalStore`. |
| `src/lib/ai/modelGarden.ts` | The 18 curated model cards. Each `hfId` is verified against the HF API. | Adding a model = verify against `huggingface.co/api/models/<id>` and check it has an `onnx/` subfolder. |
| `src/apps/AppLayout.tsx` | Wraps every tool, owns `useAIProcessor(_webGPU, appId, planOverride?)` | The single bridge between UI and `runModel`. Don't bypass it. |
| `src/lib/agent/executor.ts` | `runRecipe()` — runs a saved Workflow Builder recipe with `{var}` substitution | Used by Workflow Builder and by CustomToolRunner when a tool has multi-step prompts. |
| `src/os/appRegistry.tsx` | Single source of truth for which tools exist | New tool = add an entry here and (optionally) a desktop icon in `src/os/Desktop.tsx`. |
| `api/proxy/proxy.ts` | WebBrowser iframe proxy. SSRF-protected. | Any HTML-rewriting changes need tests covering the meta-refresh / `<base>` / srcset cases. |

### Common pitfalls (real bugs we've already fixed — don't reintroduce)

- **`useSyncExternalStore` snapshot identity.** Returning a fresh object from `getSnapshot` every call causes infinite re-renders. Cache the snapshot in module state and rebuild only on `notify()`.
- **Prewarm on cold load.** Auto-downloading 175MB of models on first paint is hostile. Prewarm is opt-in via `localStorage['webai:autoload-models'] === 'on'`.
- **Vite 5.4+ host allowlist.** LAN access requires `server.allowedHosts: true` in `vite.config.ts`. Without it, non-localhost requests get "Empty reply from server".
- **macOS firewall.** On Macs with the Application Firewall set to "block non-essential," nvm-managed `node` binaries are blocked by default. `scripts/dev.sh` detects and offers to unblock.
- **WebGPU dtype mismatch.** `q4f16` / `q4` only work on WebGPU; falling back to WASM must downgrade to `q8`. `fp32` / `fp16` / `q8` are preserved across fallback.
- **HF model paths.** Original-org repos (`HuggingFaceTB/`, `briaai/`) sometimes lack ONNX weights. Prefer `Xenova/*` and `onnx-community/*` mirrors. Verify every new `hfId` against the HF API before adding to the garden.

### Commands

```bash
npm run dev:safe        # full first-run path (firewall, ports, install, checks, start)
npm run dev             # plain vite
npm run dev:fast        # skip typecheck + tests (hot iteration)
npm run verify          # tsc + lint + tests — run before declaring "done"
npm run build:gated     # gated production build
npm run build           # plain build
npm start               # run dist/boot.js
npm run start:lan       # bind 0.0.0.0 with PORT env honored
npm test                # vitest run
npm run test:watch      # vitest watch
```

### Verification ethos (per user's CLAUDE.md)

> Never claim a task is 'complete' or 'working' without actually running/testing it first.
> Report what you verified, not just what you wrote.

For this codebase specifically:
- API endpoints: `curl` them after starting the dev server.
- Model loading: cannot be verified without a real browser. Say so.
- UI/UX: needs a browser. Say so.
- Inference: tests stub `runModel`; real model loads need a human.

---

## Part 2 — The runtime agentic patterns this project ships

The "agent" surface inside WebAI OS itself, for users who want to author or compose AI workflows.

### Tool Studio (`src/apps/system/ToolStudio.tsx`)

Author a saved AI tool without writing code.

- Pick a task (text-generation, summarization, zero-shot-classification, etc.)
- Pick a model from the Model Garden (or a custom one you added)
- Write a system prompt + user template with `{input}` placeholder
- Live-test against sample input before saving
- Saved tools appear as desktop icons under "My Tools" and in the Start Menu

Persistence: IndexedDB store `customTools`. Schema in `src/lib/ai/customTools.ts`.

### Model Garden (`src/apps/system/ModelGarden.tsx`)

18 curated transformers.js-compatible models, plus a "Add custom model" form for any HuggingFace ONNX model. Each card surfaces load state, dtype, size, and a pin/unload toggle.

Adding to the curated list (`src/lib/ai/modelGarden.ts`):
1. Verify `https://huggingface.co/api/models/<hfId>` returns 200.
2. Confirm `siblings` contains `onnx/` files.
3. Pick a `dtype`: WebGPU → `q4f16` for LLMs, `q8` for everything smaller; CPU-only → `q8`, `fp32` for models that can't be quantized (SpeechT5, MODNet).
4. Add a comment: `// Verified <date>: HTTP 200, N onnx/ siblings.`

### Workflow Builder (`src/apps/system/WorkflowBuilder.tsx`)

Compose multi-step recipes: chain a summarize → extract-entities → classify pipeline, share results between steps via `{var}` substitution.

Recipe shape (TypeScript):
```ts
interface Recipe {
  id: string;
  name: string;
  steps: RecipeStep[];
}
interface RecipeStep {
  tool: 'summarize' | 'extract_entities' | 'classify' | 'rewrite' | 'fetch' | 'save_note';
  inputs: Record<string, string>;  // values may contain {var} placeholders
  outputVar?: string;              // name to bind the step's result under
}
```

Execution: `src/lib/agent/executor.ts:runRecipe(recipe, ctx, initial, onEvent)`. Returns `{ ctx, events, failedAt? }`. Supports `AbortSignal`. A failed step does not leak its `outputVar` into scope.

Tool registry: `src/lib/agent/tools.ts`. Adding a new tool means adding to the registry + extending the `RecipeStep['tool']` union. Each tool gets its own integration test.

### CustomToolRunner (`src/apps/system/CustomToolRunner.tsx`)

The window that launches when a user clicks a saved custom tool icon. Resolves the tool from IndexedDB, calls `useAIProcessor` with a `planOverride`. Validates the `custom:<id>` route — only alphanumeric, hyphen, underscore, dot allowed.

### Remote Access (`src/apps/system/RemoteAccess.tsx`)

Generates a QR code for the LAN URL so an iPhone on the same Wi-Fi can open the OS. Defaults to IPv4 (iPhones often can't reach laptop's global IPv6). Self-tests reachability by fetching its own LAN URL — if the fetch fails, shows the macOS firewall unblock command.

---

## Part 3 — Coordination patterns for multi-agent work

If you're an orchestrator delegating to sub-agents:

- Give each sub-agent **the entire context they need** in the prompt. They don't see prior turns.
- Prefer **TDD slices**: failing test → fix → green → next slice. Easier to back out partial progress.
- Sub-agents may not have browser access; **state browser-dependent verifications as caveats**.
- After any sub-agent run: **verify the suite still passes**. Trust but verify.
- Don't run a sub-agent more than ~300 tool calls deep — they tend to hit API errors past that.

If you're a code reviewer agent (`code-review-refactor`):

- The project explicitly wants aggression on cleanup ("remove dead code, consolidate, update docs").
- But: do not delete code referenced only by tests *unless* you also delete those tests as obsolete. Tests are documentation of intent.
- Lint count is a leading indicator, not the goal. Real bugs (setState-in-effect, impure render, TDZ) come first; type widening (`any` → `unknown`) comes second.
