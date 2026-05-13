# Development

## Prerequisites

- **Node.js 20+** (24.x tested). `nvm use 24` if you have nvm.
- **npm 10+** (ships with Node 20+).
- macOS, Linux, or Windows with WSL. Browser-side WebGPU support varies by OS/browser — see the runtime notes below.
- (Optional) **MySQL 8+** if you want to enable auth + per-user persistence. The OS shell works fully without it via IndexedDB.

## First run

```bash
cd app/
npm run dev:safe
```

That single command:
1. Confirms Node ≥ 20.
2. Installs `node_modules` if missing or out of date.
3. On macOS: detects if the Node binary is blocked by the Application Firewall (the cause of "iPhone QR doesn't connect"). Offers to unblock it with `sudo`.
4. Frees ports 3000 / 3001 if a stale dev server is holding them.
5. Runs `tsc -b` and `vitest run` as a guard against starting on broken code.
6. Launches Vite on `http://localhost:3000`.

Subsequent runs can use `npm run dev` (no checks) or `npm run dev:fast` (skip checks but keep firewall/port handling).

## Common pitfalls

### "Empty reply from server" from the LAN IP, but localhost works

macOS Application Firewall is blocking the Node binary. **`scripts/dev.sh` handles this** but if you bypass it:

```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$(which node)"
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp "$(which node)"
/usr/libexec/ApplicationFirewall/socketfilterfw --getappblocked "$(which node)"
# Expected: "Incoming connection to /.../node is permitted."
```

The Remote Access app inside the OS will surface a red banner with this exact command if it detects the issue at runtime.

### Vite falls back to port 3001

A stale dev server is on 3000. Kill it:

```bash
lsof -ti tcp:3000,tcp:3001 | xargs kill -9
```

Or just use `npm run dev:safe` which does this for you. The `/api/lan` endpoint correctly reports whichever port Vite ended up on (derived from the inbound `Host` header).

### iPhone Safari shows "WebGPU unavailable"

That's correct behavior. iOS Safari ships WebGPU disabled by default; the runtime falls back to WASM/ONNX. WASM is slower but functional for the smaller models (MiniLM, DistilBART, Whisper-tiny). Larger LLMs (Llama 3.2 1B, Qwen 2.5 0.5B) are too slow on phone WASM — they're listed in Model Garden for desktop use.

To enable WebGPU on iOS Safari 18+: Settings → Safari → Advanced → Feature Flags → WebGPU.

### A model 404s on first use

Some HuggingFace repos don't ship ONNX weights. The tool will surface the actual fetch error in red. If you see this on a curated model from `src/lib/ai/modelGarden.ts`, the entry is stale — check `huggingface.co/api/models/<id>` and confirm `siblings` contains `onnx/` files. Replace with a `Xenova/*` or `onnx-community/*` mirror.

### Auto-download on cold load

The shell does **not** prewarm models by default. To opt in:

```js
localStorage.setItem('webai:autoload-models', 'on')
```

or toggle Settings → Auto-load Models. Only the 25MB MiniLM embeddings model is in the essential prewarm set; larger models are downloaded only when actually used.

### Tests claim 91/91 (or 160/160) but the user-facing app doesn't work

Tests stub `runModel` — they don't exercise real model loads. They cover:
- Runtime cache, abort, dtype fallback, snapshot stability
- Tool render-mount (67 components, no crash-on-open)
- Proxy SSRF, HTML rewriting, header sanitization
- Agent recipe executor, `{var}` substitution edge cases
- LAN address ordering
- Smoke integration tests for 4 specific tools (TLDR, Story Gen, Fact Checker)

Tests will not catch: HuggingFace 404s, WebGPU shader compile errors, broken model file integrity, browser-specific WASM issues. Those need a human at a real browser.

## Useful npm scripts

| Script | Purpose |
| --- | --- |
| `dev` | Plain Vite (fastest) |
| `dev:safe` | First-run path: install, firewall, ports, checks, then start |
| `dev:fast` | dev:safe but skips typecheck + tests |
| `setup` | Alias for `dev:fast` (one-time install + start) |
| `verify` | `check + lint + test` — run before declaring "done" |
| `check` | `tsc -b` |
| `lint` | `eslint .` |
| `test` | `vitest run` (one-shot) |
| `test:watch` | `vitest` (watch mode) |
| `format` | `prettier --write .` |
| `build` | Plain Vite + esbuild build |
| `build:gated` | Build with full check + lint + test gate |
| `build:quick` | Build with typecheck only |
| `start` | Run `dist/boot.js` |
| `start:lan` | Run `dist/boot.js` with `HOST=0.0.0.0` and a configurable `PORT` |
| `preview` | `vite preview` against the built `dist/public` |
| `db:push` | `drizzle-kit push` (if MySQL configured) |

## Environment variables

| Var | When | Notes |
| --- | --- | --- |
| `PORT` | dev + prod | Defaults to 3000. Vite falls back to 3001+ if occupied; the API derives the served port from the inbound Host header so the Remote Access QR stays correct. |
| `HOST` | prod | Bind interface. Default `0.0.0.0`. |
| `DATABASE_URL` | optional | MySQL connection string for per-user persistence + auth. The app shell works without it. |
| `KIMI_CLIENT_ID` / `KIMI_CLIENT_SECRET` / `KIMI_AUTH_URL` | optional | OAuth via Kimi. JWKS init is lazy, so empty values don't crash boot. |

## Adding a new tool

1. Create the component under the appropriate category folder, e.g. `src/apps/writing/MyTool.tsx`. Mirror the structure of an existing tool — they all wrap `<AppLayout>` and use `useAIProcessor(webGPUStatus, 'mytool')`.
2. Add a `ToolModelMap` entry in `src/lib/ai/toolModelMap.ts` binding `'mytool'` to a task, model id, prompt template, and (for zero-shot) candidate labels.
3. Register the component in `src/os/appRegistry.tsx` with a unique `id`, name, description, icon, default window size.
4. (Optional) Add a desktop icon by listing `mytool` in `src/os/Desktop.tsx`. Otherwise it only shows up in Start Menu and Tool Studio.
5. The smoke test (`src/os/appRegistry.smoke.test.tsx`) automatically picks up the new tool — confirm it renders.
6. If the tool's UX has unique error/success paths, add an integration test in `src/apps/AppLayout.integration.test.tsx`.

## Adding a curated model

1. Check `https://huggingface.co/api/models/<hfId>` returns 200 and that `siblings` contains an `onnx/` folder.
2. Add an entry to `MODEL_GARDEN` in `src/lib/ai/modelGarden.ts`. Pick `dtype`:
   - WebGPU: `q4f16` (LLMs), `q8` (everything else)
   - WASM/CPU: `q8`, or `fp32` for non-quantizable models (SpeechT5, MODNet)
3. Add a `// Verified <date>: HTTP 200, N onnx/ siblings.` comment.
4. Don't set `essential: true` unless the model is <50MB.

## Running the production build locally

```bash
npm run build:gated   # build with full verify gate
npm run start:lan     # serve dist/ on PORT (default 3000)
```

Or, all in one:

```bash
bash scripts/build.sh && bash scripts/start.sh
```
