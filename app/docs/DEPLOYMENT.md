# Deployment

WebAI OS is a static SPA + a Node API. Both ship from the same `dist/` folder produced by `npm run build`. There is no per-user model state on the server — all inference is in the user's browser, so the server is stateless apart from optional MySQL-backed auth + notes.

## What the build produces

```
dist/
├── boot.js                                # bundled Hono server (esbuild ESM)
└── public/
    ├── index.html
    ├── app.js                             # SPA bundle (IIFE, ~1.6MB / 442KB gz)
    └── ort-wasm-simd-threaded.asyncify-*.wasm   # ~23MB, lazy-loaded only on WASM fallback
```

The `app.js` is a single-file IIFE on purpose: it can be served from any static host with no chunk-loading concerns. The 23MB WASM blob is only fetched when WebGPU is unavailable (iOS Safari, older browsers, headless contexts).

## Build the artifact

```bash
npm run build:gated
```

That runs:
- `tsc -b` (typecheck)
- `eslint .` (lint)
- `vitest run` (tests)
- `vite build` (SPA + assets → `dist/public`)
- `esbuild api/boot.ts` (server → `dist/boot.js`)

Add `--quick` (i.e. `bash scripts/build.sh --quick`) to skip lint + tests if you're iterating on a deploy script. Don't skip typecheck — the prod bundle relies on type-driven code paths.

## Server-side requirements

| Component | Required? | Notes |
| --- | --- | --- |
| Node 20+ | yes | The `dist/boot.js` ESM bundle uses top-level await + `node:` protocol imports. |
| Public TCP port | yes | `PORT` env. Defaults to 3000. |
| MySQL 8+ | optional | Only if you want auth + per-user note persistence. Set `DATABASE_URL`. |
| Outbound HTTPS to `huggingface.co` | for model downloads (clients) | Server doesn't need this — clients fetch models directly. |

## Minimal deploy (single VM, no auth)

```bash
# On the server:
npm ci --omit=dev
npm run build:quick
PORT=80 npm start
```

Bind to 80 with `setcap` or run behind a reverse proxy. Recommended: a TLS-terminating proxy in front of `node dist/boot.js`.

## Behind nginx / Caddy

The Hono server serves both `/api/*` and the SPA. Two options:

**Option A — server serves everything.** Simplest. Proxy all traffic to Node:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

**Option B — nginx serves static, Node serves API only.** Slightly faster static hit but you must keep `dist/public` in sync with `dist/boot.js`.

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000;
}
location / {
  root /var/www/webai/dist/public;
  try_files $uri /index.html;
}
```

The `/oauth/callback` route (if using Kimi auth) must also be proxied to Node.

## Docker

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:quick

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/boot.js"]
```

Image size: ~250MB (Alpine + the ORT WASM file is the dominant cost).

## Environment variables (production)

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | — | Must be `production` for `dist/boot.js` to call `serve()`. |
| `PORT` | yes | `3000` | TCP port to listen on. |
| `HOST` | no | `0.0.0.0` | Bind interface. |
| `DATABASE_URL` | no | — | MySQL connection string. If unset, auth + notes APIs return appropriate empty responses; the SPA still works fully via IndexedDB. |
| `KIMI_CLIENT_ID` | no | — | OAuth client id. |
| `KIMI_CLIENT_SECRET` | no | — | OAuth client secret. |
| `KIMI_AUTH_URL` | no | — | OAuth issuer URL. JWKS construction is lazy — empty values won't crash boot, but `/oauth/callback` will throw a descriptive error if hit. |

## Security checklist

- **CSP / framing**: the SPA itself does not need `frame-ancestors` restrictions, but if you embed `/api/proxy` responses in iframes from your own domain, set a permissive CSP on the proxy origin only.
- **`/api/proxy` exposure**: by default this is an open proxy reachable from any host that can reach your server. It refuses private IPs (loopback, RFC1918, link-local, IPv6 unique-local) at the request layer, but you should still rate-limit it at the reverse proxy. Consider IP-allowlisting or auth-gating in any non-personal deployment.
- **Auth proxy in front**: the SPA shell has no built-in user auth (it's a personal-use OS). If you expose the dev server or unauthenticated prod build to the internet, put an auth proxy (Cloudflare Access, Authelia, oauth2-proxy, …) in front of port 3000.
- **TLS**: the model downloads from `huggingface.co` happen client-side over HTTPS regardless of your origin's protocol. But serve the SPA over HTTPS yourself — WebGPU requires a secure context.
- **WASM threading**: the ORT WASM file is built with `SharedArrayBuffer` support. Multi-threaded WASM needs COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) on the document. These are *not* set by default because they break the `/api/proxy` iframe pattern. If you want maximum WASM speed and don't use the proxy, enable them in nginx/Caddy.
- **No outbound model exfiltration**: by design, all inference runs in the user's browser. The server never sees prompts or model outputs.

## Health checks

| Endpoint | Expected |
| --- | --- |
| `GET /` | 200 (HTML) |
| `GET /api/lan` | 200 JSON with `{ port, addresses[] }`. Useful as a readiness check. |
| `GET /api/proxy?url=https://example.com` | 200 with rewritten HTML. Tests the proxy and outbound connectivity. |

A reasonable Kubernetes-style probe:

```yaml
livenessProbe:
  httpGet: { path: /api/lan, port: 3000 }
  initialDelaySeconds: 5
  periodSeconds: 30
readinessProbe:
  httpGet: { path: /, port: 3000 }
  periodSeconds: 5
```

## What WebAI OS does not do server-side

The shell is browser-first by design. The server does **not**:
- Run any model inference. Every `runModel` call happens in the user's WebGPU/WASM context.
- Store user prompts, generated text, audio, or images.
- Forward requests to OpenAI / Anthropic / Google. No third-party AI APIs are wired in.
- Track usage.

If you need any of those, they're new features, not deployment configuration.
