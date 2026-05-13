import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr(), react()],
  server: {
    port: 3000,
    // Bind to all interfaces so other devices on the LAN (iPhone, iPad, etc.)
    // can hit the dev server. Settings → Remote Access shows the URL + QR.
    host: true,
    // Vite 5.4+ rejects requests whose Host header isn't in this list (CVE-2025-24010).
    // Default only includes localhost/127.0.0.1/::1, so LAN IPs get "Empty reply from server".
    // `true` allows any host — safe for local dev; do not enable in a publicly-exposed deploy.
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  base: './',
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    assetsDir: '.',
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'app.js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
        inlineDynamicImports: true,
      },
    },
  },
});
