# Architecture

WebAI OS is a single-page React application styled as a desktop OS, hosting ~67 AI tools that run inference entirely in the user's browser via `@huggingface/transformers`. A thin Hono server provides three runtime concerns: an iframe-safe browser proxy, LAN address enumeration for phone access, and tRPC for any per-user persistence the user has enabled.

## High-level diagram

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser                                                           │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  App.tsx (shell)                                         │      │
│  │   ├─ Desktop ───→ launches windows                       │      │
│  │   ├─ AppWindow ──→ wraps each tool in <ErrorBoundary>    │      │
│  │   │      └─ <ToolComponent />                            │      │
│  │   │             └─ useAIProcessor(appId)                 │      │
│  │   │                     └─ runModel({task, modelId, …}) │      │
│  │   ├─ StartMenu                                           │      │
│  │   └─ Taskbar / Notifications                             │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                    │
│  src/lib/ai/runtime.ts                                             │
│   ├─ pipeline cache (key = task::modelId::device::dtype)           │
│   ├─ WebGPU → WASM fallback                                        │
│   ├─ AbortSignal threading (load + inference)                      │
│   └─ useSyncExternalStore-friendly snapshot                        │
│                ↓                                                   │
│  @huggingface/transformers (WebGPU / ONNX Runtime Web)             │
│                ↓                                                   │
│  IndexedDB cache (browser-managed model weights)                   │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ /api/proxy   /api/lan   /api/trpc
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│  Hono server (api/boot.ts)                                         │
│   ├─ /api/proxy  → SSRF-safe iframe browser proxy                  │
│   ├─ /api/lan    → enumerate LAN URLs for Remote Access QR         │
│   ├─ /api/trpc/* → tRPC router (optional, for auth + persistence)  │
│   └─ /oauth/callback (Kimi)                                        │
│                                                                    │
│   In dev: mounted as @hono/vite-dev-server middleware              │
│   In prod: @hono/node-server serving static dist/public + API      │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ↓ (optional, only if auth + DB enabled)
                       MySQL via Drizzle ORM
```

## Layers

### 1. Shell (`src/os/`)

| File | Responsibility |
| --- | --- |
| `appRegistry.tsx` | Single source of truth for which tools exist. Each entry binds an `id` to a component + window defaults. |
| `Desktop.tsx` | Renders the desktop icon grid + "My Tools" section for saved custom tools. |
| `StartMenu.tsx` | Categorized full app list. |
| `AppWindow.tsx` | Per-window chrome: title bar, drag/resize, maximize/minimize, narrow-viewport force-fullscreen. |
| `Taskbar.tsx` | Bottom strip with Start button + open windows. |
| `ErrorBoundary.tsx` | Wraps every AppComponent so one tool's render crash doesn't take down the shell. |
| `Notifications.tsx` | Toast stack. |

`App.tsx` composes these into z-indexed layers, with `pointer-events: none` on the window wrapper so clicks pass through to the Desktop when no window covers that area.

### 2. AppLayout + inference seam (`src/apps/AppLayout.tsx`)

Every tool component receives `webGPUStatus`, `onNotify`, and `data` props. They wrap their UI in `<AppLayout>` and call `useAIProcessor(webGPUStatus, appId, planOverride?)`. This hook:

1. Resolves the appropriate task / modelId / prompt template via `toolModelMap.ts`
2. Manages local input/output state
3. Calls `runModel` from `runtime.ts`
4. Surfaces load progress, abort, and errors to the DOM (red error box with the actual exception message)

`CustomToolRunner.tsx` uses the same hook with a `planOverride` derived from the saved IndexedDB tool record.

### 3. Runtime (`src/lib/ai/`)

| File | Responsibility |
| --- | --- |
| `runtime.ts` | Pipeline cache, WebGPU/WASM detection + fallback, abort, snapshot store (`useSyncExternalStore` source), 12k-char input cap. |
| `modelGarden.ts` | 18 curated `ModelCard`s, each verified against HF API. |
| `toolModelMap.ts` | Maps an app id (`tldr`, `factchecker`, ...) to a task + model + prompt template. |
| `format.ts` | Normalizes transformers.js pipeline outputs into display strings. |
| `customTools.ts` | IndexedDB load/save for custom models, custom tools, and recipes. |

### 4. Agent layer (`src/lib/agent/`)

| File | Responsibility |
| --- | --- |
| `tools.ts` | Tool registry — each entry is `(input, ctx) => Promise<unknown>`. Includes `{var}` substitution helper. |
| `executor.ts` | `runRecipe()` — runs a sequence of tool calls, threads context between steps, supports abort, returns `failedAt` on error. |

The Workflow Builder app is a UI over `runRecipe`. Multi-step custom tools authored in Tool Studio compile down to recipes.

### 5. Storage (`src/lib/storage/db.ts`)

A thin IndexedDB wrapper with four object stores:
- `customTools` (Tool Studio output)
- `customModels` (user-added HF model entries)
- `recipes` (Workflow Builder output)
- `notes` (Notes app)
- `files` (File Manager virtual filesystem)

Schema versioning is single-stepped: bumping the DB version requires a migration block in `db.ts`.

### 6. Server (`api/`)

| File | Responsibility |
| --- | --- |
| `boot.ts` | Hono root. Registers all routes. In dev, exported and mounted as Vite middleware. In prod, also calls `serve()`. |
| `proxy/proxy.ts` | `/api/proxy?url=…` — fetches a URL, strips `X-Frame-Options` / CSP frame-ancestors, rewrites links/srcset/css-url/meta-refresh so navigation stays inside the proxy. SSRF blocklist: loopback, RFC1918, IPv4/v6 link-local, IPv6 unique-local. |
| `lan/lan.ts` | Enumerates `os.networkInterfaces()` → returns IPv4-first list with shareable URLs. |
| `kimi/auth.ts` | OAuth callback + lazy-init JWKS verifier. The lazy pattern is required: empty `kimiAuthUrl` at module load time should not crash. |
| `router.ts`, `trpc/*` | tRPC routers for authenticated persistence. *Off-limits for refactor agents.* |

### 7. Build (`vite.config.ts` + `package.json`)

- Vite dev server on port 3000 with `host: true` and `allowedHosts: true` (LAN access).
- `@hono/vite-dev-server` plugin mounts `api/boot.ts` as middleware in dev so the same Hono app serves API in both modes.
- Production: `vite build` emits a single IIFE `app.js` (~1.6MB / 442KB gzip) + the ONNX Runtime WASM blob (~23MB, lazy-loaded only when WebGPU is unavailable). `esbuild` bundles `api/boot.ts` to `dist/boot.js`.
- `optimizeDeps.exclude: ['@huggingface/transformers']` — required for the transformers WebGPU shader loader to work in dev.

## Boot order (dev)

1. `npm run dev` → Vite starts.
2. `@hono/vite-dev-server` plugin loads `api/boot.ts` via `ssrLoadModule`.
3. Vite middleware chain: static → Hono (for `/api/*`) → Vite SPA index.
4. Client `App.tsx` mounts. `useEffect` reads `localStorage['webai:autoload-models']`; if `'on'`, calls `warmModel` for each essential model.
5. User clicks a tool icon → `openWindow(appId)` → `<AppWindow>` mounts the component inside an error boundary.
6. Tool calls `useAIProcessor` → `runModel` → `loadPipeline` → first call downloads the model from HuggingFace (cached in IndexedDB by transformers.js), subsequent calls hit the in-memory pipeline cache.

## Boot order (prod)

Same as dev minus the Vite middleware. `dist/boot.js` calls `@hono/node-server`'s `serve()` and `serveStaticFiles(app)` serves `dist/public`. The bundled API is identical; only the static-asset path differs.
