import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { handleProxyRequest } from "./proxy/proxy";
import { getLanAddresses } from "./lan/lan";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// WebBrowser proxy — fetches a URL, strips X-Frame-Options / CSP frame-ancestors,
// rewrites links so navigation stays inside the proxy. Refuses non-public hosts.
app.get("/api/proxy", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ error: "missing ?url=" }, 400);
  return handleProxyRequest(url, "/api/proxy");
});

// LAN addresses for the Remote Access panel (Settings) and the iPhone QR.
// Port must match what the client is currently connected to — Vite may fall
// back from 3000 to 3001+ if the preferred port is in use, and PORT is unset
// in dev. Derive from the inbound Host header, fall back to env, then 3000.
//
// CORS-open: the response is a list of local network addresses — non-sensitive
// info. Remote Access fetches this cross-origin (localhost page → LAN IP) as
// its reachability probe, so without these headers the check falsely flags
// "blocked" due to CORS rather than actual unreachability.
app.use("/api/lan", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});
app.get("/api/lan", (c) => {
  const hostHeader = c.req.header("host") || "";
  const hostPort = hostHeader.includes(":") ? hostHeader.split(":").pop()! : "";
  const port = parseInt(hostPort || process.env.PORT || "3000", 10);
  return c.json({ port, addresses: getLanAddresses(port) });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  startServer();
}

async function startServer() {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
