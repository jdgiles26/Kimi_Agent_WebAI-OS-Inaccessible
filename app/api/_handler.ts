// Source for the Vercel serverless function. `vercel-build` bundles this
// into `api/index.mjs` (everything inlined) which is what Vercel actually
// deploys. The underscore prefix keeps this source file out of Vercel's
// auto-discovery — only the generated `index.mjs` is treated as a function.
// vercel.json rewrites /api/(.*) → /api so every API path hits this one.
//
// Use @hono/node-server/vercel (not hono/vercel) because we run on the
// Node runtime, which delivers (IncomingMessage, ServerResponse). The
// hono/vercel adapter assumes a Web-standard Request and crashes with
// `c.req.raw.headers.get is not a function` on Node-style requests.
import { handle } from "@hono/node-server/vercel";
import app from "./_boot";

export const config = { runtime: "nodejs", maxDuration: 30 };

export default handle(app);
