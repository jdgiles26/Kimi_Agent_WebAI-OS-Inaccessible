/**
 * Unit tests for the AI runtime module.
 *
 * We mock @huggingface/transformers so no real model download occurs.
 * The goal is to test the cache, in-flight deduplication, abort, and
 * input-cap logic independently of the HF library.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock transformers.js BEFORE importing runtime.
// vi.mock is hoisted, so we must declare the mock function via vi.hoisted.
// ---------------------------------------------------------------------------
const { mockPipeline } = vi.hoisted(() => ({ mockPipeline: vi.fn() }));

vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
    remoteHost: 'https://huggingface.co',
  },
}));

import {
  runModel,
  loadPipeline,
  unloadModel,
  unloadAll,
  RunAbortedError,
  getRuntimeSnapshot,
} from './runtime';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Makes a fake pipeline function that resolves after `delayMs`. */
function makeFakePl(result: any, delayMs = 0) {
  const pl = vi.fn(async () => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    return result;
  });
  // Make the HF pipeline factory return this function.
  return pl;
}

// Each test gets a fresh cache by unloading all models.
// vi.resetAllMocks also clears the mockReturnValueOnce/mockResolvedValueOnce
// queues so stale mocks from previous tests can't bleed in.
beforeEach(async () => {
  vi.resetAllMocks();
  await unloadAll();
});

afterEach(async () => {
  await unloadAll();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runModel — input cap', () => {
  it('truncates string inputs longer than 12000 chars', async () => {
    const received: string[] = [];
    const pl = vi.fn(async (input: string) => {
      received.push(input);
      return [{ summary_text: 'ok' }];
    });
    mockPipeline.mockResolvedValueOnce(pl);

    const longInput = 'x'.repeat(20_000);
    await runModel({ task: 'summarization', modelId: 'test/model', input: longInput });

    expect(received[0]).toHaveLength(12_000);
  });

  it('truncates content fields in chat message arrays', async () => {
    const received: any[] = [];
    const pl = vi.fn(async (input: any) => {
      received.push(input);
      return [{ generated_text: 'hi' }];
    });
    mockPipeline.mockResolvedValueOnce(pl);

    const messages = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'A'.repeat(20_000) },
    ];
    await runModel({ task: 'text-generation', modelId: 'test/model', input: messages });

    expect(received[0][1].content).toHaveLength(12_000);
    expect(received[0][0].content).toBe('You are helpful.'); // system msg unchanged
  });

  it('passes short inputs through unchanged', async () => {
    const received: string[] = [];
    const pl = vi.fn(async (input: string) => {
      received.push(input);
      return [{ summary_text: 'ok' }];
    });
    mockPipeline.mockResolvedValueOnce(pl);

    await runModel({ task: 'summarization', modelId: 'test/model', input: 'hello world' });
    expect(received[0]).toBe('hello world');
  });
});

describe('runModel — AbortController', () => {
  it('throws RunAbortedError when signal is pre-aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const pl = vi.fn();
    mockPipeline.mockResolvedValueOnce(pl);

    await expect(
      runModel({
        task: 'summarization',
        modelId: 'test/abort',
        input: 'hello',
        options: { signal: controller.signal },
      }),
    ).rejects.toBeInstanceOf(RunAbortedError);

    // Pipeline factory should never be called when pre-aborted.
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('throws RunAbortedError when signal fires mid-inference', async () => {
    const controller = new AbortController();

    // Pipeline takes 50ms — we abort after 10ms.
    const pl = vi.fn(
      () =>
        new Promise<any>((resolve) => {
          // Resolve after 50ms; the abort race should win first.
          setTimeout(() => resolve([{ summary_text: 'done' }]), 50);
        }),
    );
    // mockPipeline returns the callable pipeline synchronously.
    mockPipeline.mockResolvedValueOnce(pl);

    const runPromise = runModel({
      task: 'summarization',
      modelId: 'test/abort-mid-inference',
      input: 'hello',
      options: { signal: controller.signal },
    });

    // Abort mid-inference after 10ms — before the 50ms pipeline resolves.
    setTimeout(() => controller.abort(), 10);

    await expect(runPromise).rejects.toBeInstanceOf(RunAbortedError);
  });
});

describe('runModel — AbortController mid-load', () => {
  it('throws RunAbortedError and cleans inFlight/loadingState when signal fires during model download', async () => {
    const controller = new AbortController();

    // The HF pipeline factory never resolves (simulates a stalled download).
    // We keep a handle so we can optionally resolve after the abort.
    let resolvePipelineFactory!: (pl: any) => void;
    const fakePl = vi.fn(async () => [{ summary_text: 'done' }]);
    mockPipeline.mockImplementation(
      () =>
        new Promise<any>((resolve) => {
          resolvePipelineFactory = resolve;
        }),
    );

    const runPromise = runModel({
      task: 'summarization',
      modelId: 'test/mid-load-abort',
      input: 'hello',
      options: { signal: controller.signal },
    });

    // Flush microtasks so loadPipeline reaches `await hfPipeline(...)`.
    await Promise.resolve();
    await Promise.resolve();

    // Abort while the factory is still pending (mid-download).
    controller.abort();

    await expect(runPromise).rejects.toBeInstanceOf(RunAbortedError);

    // Loading state should be cleaned up after the abort.
    expect(getRuntimeSnapshot().loading).toHaveLength(0);

    // Resolve the dangling factory promise to avoid test-leak warnings.
    resolvePipelineFactory(fakePl);

    // After abort cleanup, a fresh load with the same key should be possible
    // (the inFlight entry must have been removed so a new load can start).
    mockPipeline.mockResolvedValueOnce(fakePl);
    const lm = await loadPipeline({
      task: 'summarization',
      modelId: 'test/mid-load-abort',
      device: 'wasm',
      dtype: 'q8',
    });
    expect(lm).toBeDefined();
    expect(getRuntimeSnapshot().loaded).toHaveLength(1);
  });
});

describe('loadPipeline — in-flight deduplication with caller-B abort', () => {
  it("B's abort short-circuits B's promise without canceling A's load", async () => {
    // Caller A starts a load. Caller B joins the same in-flight promise but
    // provides its own AbortSignal. When B aborts, B should get RunAbortedError
    // but A's load should still complete successfully.
    const controllerB = new AbortController();

    const fakePl = vi.fn(async () => [{ summary_text: 'ready' }]);
    let resolveLoad!: (pl: any) => void;
    mockPipeline.mockImplementation(
      () => new Promise<any>((resolve) => { resolveLoad = resolve; }),
    );

    // Caller A — no signal.
    const promiseA = loadPipeline({
      task: 'summarization',
      modelId: 'test/dedup-abort',
      device: 'wasm',
      dtype: 'q8',
    });

    // Flush so loadPipeline A registers inFlight.
    await Promise.resolve();
    await Promise.resolve();

    // Caller B — joins the same in-flight with an abort signal.
    const promiseB = loadPipeline({
      task: 'summarization',
      modelId: 'test/dedup-abort',
      device: 'wasm',
      dtype: 'q8',
      signal: controllerB.signal,
    });

    // B aborts before the download finishes.
    controllerB.abort();

    // B should reject with RunAbortedError.
    await expect(promiseB).rejects.toBeInstanceOf(RunAbortedError);

    // Resolve the factory — A should still succeed.
    resolveLoad(fakePl);
    const lm = await promiseA;
    expect(lm).toBeDefined();
    expect(lm.modelId).toBe('test/dedup-abort');
  });
});

describe('loadPipeline — caching and deduplication', () => {
  it('returns the same LoadedModel for the same cache key without re-loading', async () => {
    const pl = makeFakePl([{ summary_text: 'ok' }]);
    // First call creates; second call returns from cache.
    mockPipeline.mockResolvedValue(pl);

    const lm1 = await loadPipeline({ task: 'summarization', modelId: 'test/cache', device: 'wasm', dtype: 'q8' });
    const lm2 = await loadPipeline({ task: 'summarization', modelId: 'test/cache', device: 'wasm', dtype: 'q8' });

    expect(lm1).toBe(lm2);
    // HF pipeline factory called exactly once.
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it('de-duplicates concurrent loads of the same key to a single fetch', async () => {
    // mockPipeline (the HF pipeline factory) blocks until we resolve it.
    // This simulates a slow model download. We use a deferred pattern so
    // the resolve handle is available after microtasks run.
    const fakePl = vi.fn(async () => [{ summary_text: 'ready' }]);
    let resolveLoad!: (pl: any) => void;
    const blockingPromise = new Promise<any>((resolve) => {
      resolveLoad = resolve;
    });
    mockPipeline.mockImplementation(() => blockingPromise);

    // Fire two concurrent loads with the same key.
    const p1 = loadPipeline({ task: 'summarization', modelId: 'test/dedup3', device: 'wasm', dtype: 'q8' });
    const p2 = loadPipeline({ task: 'summarization', modelId: 'test/dedup3', device: 'wasm', dtype: 'q8' });

    // Flush microtasks so both loadPipeline calls reach await hfPipeline().
    await Promise.resolve();
    await Promise.resolve();

    // Resolve the factory — both waiters should get the same LoadedModel object.
    resolveLoad(fakePl);
    const [lm1, lm2] = await Promise.all([p1, p2]);

    expect(lm1).toBe(lm2);
    // The HF factory should only have been called once regardless of how many
    // concurrent callers were waiting.
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });
});

describe('loadPipeline — WebGPU→WASM dtype fallback matrix', () => {
  /**
   * When WebGPU load fails and we fall back to WASM, we must preserve
   * CPU-compatible dtypes (q8, fp32, fp16) and only downgrade GPU-only
   * dtypes (q4f16, q4) to q8.
   *
   * The matrix:
   *   declared dtype | fallback dtype
   *   q4f16          | q8     ← GPU-only, must downgrade
   *   q4             | q8     ← GPU-only, must downgrade
   *   fp32           | fp32   ← already CPU-safe, preserve
   *   q8             | q8     ← already CPU-safe, preserve
   *   fp16           | fp16   ← already CPU-safe, preserve
   */

  function makeWebGPUThenWasmMock(capturedArgs: any[]) {
    let callCount = 0;
    mockPipeline.mockImplementation((...args: any[]) => {
      capturedArgs.push(args);
      callCount++;
      if (callCount === 1) {
        // First call (webgpu) — fail to trigger fallback.
        return Promise.reject(new Error('WebGPU init failed'));
      }
      // Second call (wasm fallback) — succeed with a dummy pipeline.
      const fakePl = vi.fn(async () => []);
      return Promise.resolve(fakePl);
    });
  }

  it('downgrades q4f16 → q8 on WASM fallback', async () => {
    const args: any[] = [];
    makeWebGPUThenWasmMock(args);

    await loadPipeline({
      task: 'text-generation',
      modelId: 'test/dtype-q4f16',
      device: 'webgpu',
      dtype: 'q4f16',
    });

    // The second HF pipeline call is the WASM fallback.
    expect(args).toHaveLength(2);
    const fallbackOpts = args[1][2]; // hfPipeline(task, modelId, options)
    expect(fallbackOpts.dtype).toBe('q8');
  });

  it('downgrades q4 → q8 on WASM fallback', async () => {
    const args: any[] = [];
    makeWebGPUThenWasmMock(args);

    await loadPipeline({
      task: 'text-generation',
      modelId: 'test/dtype-q4',
      device: 'webgpu',
      dtype: 'q4',
    });

    expect(args).toHaveLength(2);
    const fallbackOpts = args[1][2];
    expect(fallbackOpts.dtype).toBe('q8');
  });

  it('preserves fp32 dtype on WASM fallback (does NOT corrupt fp32 models)', async () => {
    const args: any[] = [];
    makeWebGPUThenWasmMock(args);

    await loadPipeline({
      task: 'image-segmentation',
      modelId: 'test/dtype-fp32',
      device: 'webgpu',
      dtype: 'fp32',
    });

    expect(args).toHaveLength(2);
    const fallbackOpts = args[1][2];
    expect(fallbackOpts.dtype).toBe('fp32');
  });

  it('preserves q8 dtype on WASM fallback', async () => {
    const args: any[] = [];
    makeWebGPUThenWasmMock(args);

    await loadPipeline({
      task: 'summarization',
      modelId: 'test/dtype-q8',
      device: 'webgpu',
      dtype: 'q8',
    });

    expect(args).toHaveLength(2);
    const fallbackOpts = args[1][2];
    expect(fallbackOpts.dtype).toBe('q8');
  });
});

describe('unloadModel', () => {
  it('removes the entry from the cache and calls dispose if present', async () => {
    const disposeFn = vi.fn(async () => {});
    const fakePl = vi.fn(async (input: any) => input);
    (fakePl as any).dispose = disposeFn;
    mockPipeline.mockResolvedValueOnce(fakePl);

    const lm = await loadPipeline({ task: 'summarization', modelId: 'test/unload', device: 'wasm', dtype: 'q8' });
    expect(getRuntimeSnapshot().loaded).toHaveLength(1);

    await unloadModel(lm.cacheKey);
    expect(getRuntimeSnapshot().loaded).toHaveLength(0);
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — unloading a missing key is a no-op', async () => {
    await expect(unloadModel('nonexistent::key')).resolves.toBeUndefined();
  });
});

describe('getRuntimeSnapshot — referential stability', () => {
  it('returns the SAME reference across consecutive calls when nothing has changed', () => {
    // useSyncExternalStore loops infinitely if getSnapshot returns a new object
    // every call. This bug crashed Model Garden on mount before the fix.
    const a = getRuntimeSnapshot();
    const b = getRuntimeSnapshot();
    const c = getRuntimeSnapshot();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('returns a NEW reference after state changes (load/unload triggers notify)', async () => {
    const fakePl = vi.fn(async (input: any) => input);
    mockPipeline.mockResolvedValueOnce(fakePl);

    const before = getRuntimeSnapshot();
    const lm = await loadPipeline({
      task: 'summarization',
      modelId: 'test/snapshot-stability',
      device: 'wasm',
      dtype: 'q8',
    });
    const after = getRuntimeSnapshot();
    expect(after).not.toBe(before);
    expect(after.loaded).toHaveLength(1);

    await unloadModel(lm.cacheKey);
    const final = getRuntimeSnapshot();
    expect(final).not.toBe(after);
    expect(final.loaded).toHaveLength(0);
  });
});
