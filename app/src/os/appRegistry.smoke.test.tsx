import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Component, type ReactNode } from 'react';

// Mock everything that touches the network or IDB so the smoke test is hermetic.
// IMPORTANT: getRuntimeSnapshot returns a *stable* reference. useSyncExternalStore
// loops infinitely if the snapshot identity changes when nothing actually changed —
// the same bug we just fixed in the production runtime.
const STABLE_SNAPSHOT = {
  loaded: [],
  loading: [],
  webgpuSupported: false,
  preferredDevice: 'wasm' as const,
};
vi.mock('@/lib/ai/runtime', () => ({
  runModel: vi.fn(async () => null),
  loadPipeline: vi.fn(async () => ({})),
  detectWebGPU: vi.fn(async () => false),
  getRuntimeSnapshot: vi.fn(() => STABLE_SNAPSHOT),
  subscribeRuntime: vi.fn(() => () => {}),
  unloadModel: vi.fn(async () => {}),
  unloadAll: vi.fn(async () => {}),
}));

vi.mock('@/lib/ai/customTools', () => ({
  loadCustomTools: vi.fn(async () => []),
  loadCustomModels: vi.fn(async () => []),
  saveCustomTool: vi.fn(async () => {}),
  saveCustomModel: vi.fn(async () => {}),
  deleteCustomTool: vi.fn(async () => {}),
  deleteCustomModel: vi.fn(async () => {}),
  loadRecipes: vi.fn(async () => []),
  saveRecipe: vi.fn(async () => {}),
  deleteRecipe: vi.fn(async () => {}),
}));

vi.mock('@/hooks/useNotes', () => ({
  useNotes: () => ({ notes: [], addNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn() }),
}));
vi.mock('@/hooks/useFileSystem', () => ({
  useFileSystem: () => ({
    files: [],
    getChildren: vi.fn(() => []),
    getNode: vi.fn(() => null),
    createFolder: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    renameNode: vi.fn(),
    deleteNode: vi.fn(),
    moveNode: vi.fn(),
    searchFiles: vi.fn(() => []),
  }),
}));

// fetch is unavailable in jsdom by default; return a benign empty response.
globalThis.fetch = vi.fn(async () =>
  new Response(JSON.stringify({ port: 3000, addresses: [] }), { status: 200 }),
) as unknown as typeof fetch;

// Catch any render-phase throw without crashing the test.
class Boundary extends Component<{ children: ReactNode; onCatch: (e: Error) => void }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error) {
    this.props.onCatch(err);
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

// Import the registry AFTER mocks so its transitive imports get the stubs.
import { appRegistry } from './appRegistry';

describe('appRegistry smoke — every tool renders without throwing', () => {
  for (const app of appRegistry) {
    it(`${app.id} (${app.name}) mounts`, () => {
      let caught: Error | null = null;
      try {
        render(
          <Boundary onCatch={(e) => (caught = e)}>
            <app.component
              windowId={`smoke-${app.id}`}
              data={{}}
              onNotify={() => {}}
              webGPUStatus={{ supported: false, state: 'unsupported', message: '' }}
            />
          </Boundary>,
        );
      } catch (err) {
        caught = err as Error;
      } finally {
        cleanup();
      }
      expect(caught, `${app.id} threw on mount: ${caught}`).toBeNull();
    });
  }
});
