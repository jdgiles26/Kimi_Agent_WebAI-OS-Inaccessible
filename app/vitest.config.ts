import { defineConfig } from 'vitest/config';
import path from 'path';

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      '@': path.resolve(templateRoot, 'src'),
      '@contracts': path.resolve(templateRoot, 'contracts'),
      '@db': path.resolve(templateRoot, 'db'),
      db: path.resolve(templateRoot, 'db'),
      '@assets': path.resolve(templateRoot, 'attached_assets'),
    },
  },
  test: {
    // Two projects: node API tests + jsdom UI tests.
    projects: [
      {
        extends: true,
        test: {
          name: 'api',
          environment: 'node',
          include: ['api/**/*.{test,spec}.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
          // Heavy transformers.js shouldn't be pulled into unit tests.
          server: { deps: { inline: [/lucide-react/] } },
        },
      },
    ],
  },
});
