// Source for the Vercel serverless function. `vercel-build` bundles this
// into `api/index.mjs` (everything inlined) which is what Vercel actually
// deploys. The underscore prefix keeps this source file out of Vercel's
// auto-discovery — only the generated `index.mjs` is treated as a function.
// vercel.json rewrites /api/(.*) → /api so every API path hits this one.
import { handle } from "hono/vercel";
import app from "./_boot";

export const config = { runtime: "nodejs", maxDuration: 30 };

export default handle(app);
