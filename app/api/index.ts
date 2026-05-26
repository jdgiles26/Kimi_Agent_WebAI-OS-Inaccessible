// Single Vercel serverless function that handles every /api/* request.
// Vercel's auto-detection picks up files in /api with default exports as
// functions; the rest of the Hono app lives in _boot.ts (underscore prefix
// keeps it out of that detection). vercel.json rewrites /api/(.*) here.
import { handle } from "hono/vercel";
import app from "./_boot";

export const config = { runtime: "nodejs" };

export default handle(app);
