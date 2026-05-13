import { pipeline as hfPipeline, env as hfEnv } from '@huggingface/transformers';
import type { AIDevice, AIDtype, AITask, LoadedModel, ProgressEvent, RunOptions } from './types';

hfEnv.allowLocalModels = false;
hfEnv.useBrowserCache = true;
hfEnv.remoteHost = 'https://huggingface.co';

/**
 * transformers.js returns highly polymorphic pipeline objects whose call
 * signature varies per task. We narrow per-task at the runModel call sites
 * but accept `unknown` shape at the boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PipelineLike = any;

type Listener = (snapshot: RuntimeSnapshot) => void;

export interface RuntimeSnapshot {
  loaded: LoadedModel[];
  loading: { cacheKey: string; modelId: string; task: AITask; progress: number; file?: string }[];
  webgpuSupported: boolean | null;
  preferredDevice: AIDevice;
}

const cache = new Map<string, LoadedModel>();
const inFlight = new Map<string, Promise<LoadedModel>>();
const loadingState = new Map<
  string,
  { cacheKey: string; modelId: string; task: AITask; progress: number; file?: string }
>();
const listeners = new Set<Listener>();
let webgpuSupported: boolean | null = null;
let preferredDevice: AIDevice = 'webgpu';

// useSyncExternalStore requires getSnapshot to return a stable reference when
// nothing has changed. Cache the snapshot and only recompute it on notify().
let cachedSnapshot: RuntimeSnapshot = {
  loaded: [],
  loading: [],
  webgpuSupported: null,
  preferredDevice: 'webgpu',
};

function rebuildSnapshot(): RuntimeSnapshot {
  cachedSnapshot = {
    loaded: Array.from(cache.values()),
    loading: Array.from(loadingState.values()),
    webgpuSupported,
    preferredDevice,
  };
  return cachedSnapshot;
}

function notify() {
  const s = rebuildSnapshot();
  listeners.forEach((l) => l(s));
}

export function subscribeRuntime(l: Listener): () => void {
  listeners.add(l);
  l(cachedSnapshot);
  return () => listeners.delete(l);
}

export function getRuntimeSnapshot(): RuntimeSnapshot {
  return cachedSnapshot;
}

export async function detectWebGPU(): Promise<boolean> {
  if (webgpuSupported !== null) return webgpuSupported;
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    webgpuSupported = false;
    preferredDevice = 'wasm';
    notify();
    return false;
  }
  try {
    const gpu = (navigator as Navigator & {
      gpu?: { requestAdapter: () => Promise<unknown> };
    }).gpu;
    const adapter = await gpu?.requestAdapter();
    webgpuSupported = !!adapter;
    preferredDevice = adapter ? 'webgpu' : 'wasm';
  } catch {
    webgpuSupported = false;
    preferredDevice = 'wasm';
  }
  notify();
  return webgpuSupported ?? false;
}

function cacheKeyFor(task: AITask, modelId: string, device: AIDevice, dtype: AIDtype): string {
  return `${task}::${modelId}::${device}::${dtype}`;
}

export interface LoadPipelineParams {
  task: AITask;
  modelId: string;
  device?: AIDevice;
  dtype?: AIDtype;
  onProgress?: (e: ProgressEvent) => void;
  pretrainedOptions?: Record<string, unknown>;
  signal?: AbortSignal;
}

/**
 * Load a transformers.js pipeline, with WebGPU→WASM fallback and de-duplication.
 * Subsequent calls with the same cache key return the same pipeline.
 *
 * Deduplication semantics: if a load is already in-flight for the same cache
 * key, the new caller joins the shared promise rather than starting a second
 * download. If the joining caller provides an AbortSignal, their promise is
 * raced against that signal — so their call can be aborted without canceling
 * the underlying shared load that other callers depend on.
 */
export async function loadPipeline({
  task,
  modelId,
  device,
  dtype,
  onProgress,
  pretrainedOptions,
  signal,
}: LoadPipelineParams): Promise<LoadedModel> {
  await detectWebGPU();
  const targetDevice: AIDevice = device ?? preferredDevice;
  const targetDtype: AIDtype = dtype ?? (targetDevice === 'webgpu' ? 'q4f16' : 'q8');
  const key = cacheKeyFor(task, modelId, targetDevice, targetDtype);

  const cached = cache.get(key);
  if (cached) {
    onProgress?.({ status: 'ready', message: 'Already loaded', progress: 100 });
    return cached;
  }

  const existingInFlight = inFlight.get(key);
  if (existingInFlight) {
    if (onProgress) {
      // Bridge progress for late subscribers via loadingState polling.
      const entry = loadingState.get(key);
      if (entry) onProgress({ status: 'progress', progress: entry.progress, file: entry.file });
    }
    // If caller B provides a signal, race their abort against the shared load
    // so B's promise rejects immediately when aborted — without canceling the
    // shared load that caller A (and potentially other waiters) depend on.
    if (signal) {
      if (signal.aborted) return Promise.reject(new RunAbortedError());
      const abortRace = new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(new RunAbortedError()), { once: true });
      });
      return Promise.race([existingInFlight, abortRace]);
    }
    return existingInFlight;
  }

  loadingState.set(key, { cacheKey: key, modelId, task, progress: 0 });
  notify();

  const loadAttempt = async (
    useDevice: AIDevice,
    useDtype: AIDtype,
  ): Promise<LoadedModel> => {
    // transformers.js task/device/dtype unions are wider than ours; the cast
    // funnels our narrower type aliases into their generic pipeline signature.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pl: PipelineLike = await hfPipeline(task as any, modelId, {
      device: useDevice === 'cpu' ? 'wasm' : (useDevice as 'webgpu' | 'wasm'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dtype: useDtype as any,
      ...pretrainedOptions,
      // transformers.js emits a richer status set than ours; we narrow at the
      // boundary by passing the value through verbatim and treating unknown
      // statuses as the empty/undefined case.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (e: any) => {
        const evt: ProgressEvent = {
          status: e?.status,
          file: e?.file,
          loaded: e?.loaded,
          total: e?.total,
          progress: typeof e?.progress === 'number' ? e.progress : undefined,
        };
        const slot = loadingState.get(key);
        if (slot) {
          slot.progress = evt.progress ?? slot.progress;
          slot.file = evt.file ?? slot.file;
          notify();
        }
        onProgress?.(evt);
      },
    });
    const lm: LoadedModel = {
      cacheKey: key,
      modelId,
      task,
      device: useDevice,
      dtype: useDtype,
      pipeline: pl,
      loadedAt: Date.now(),
    };
    return lm;
  };

  // Build an abort-rejection promise if a signal was provided.
  const abortPromise: Promise<never> | null = signal
    ? new Promise<never>((_, reject) => {
        if (signal.aborted) {
          reject(new RunAbortedError());
        } else {
          signal.addEventListener('abort', () => reject(new RunAbortedError()), { once: true });
        }
      })
    : null;

  const raceLoad = async (useDevice: AIDevice, useDtype: AIDtype): Promise<LoadedModel> => {
    const attempt = loadAttempt(useDevice, useDtype);
    if (abortPromise) {
      return Promise.race([attempt, abortPromise]);
    }
    return attempt;
  };

  const promise = (async () => {
    try {
      let lm: LoadedModel;
      try {
        lm = await raceLoad(targetDevice, targetDtype);
      } catch (err) {
        if (err instanceof RunAbortedError) throw err;
        if (targetDevice === 'webgpu') {
          console.warn(`[ai] WebGPU load failed for ${modelId}; falling back to wasm`, err);
          // Preserve CPU-compatible dtypes (q8, fp32, fp16); only downgrade
          // GPU-only dtypes (q4f16, q4) which would fail or corrupt on WASM.
          const wasmDtype: AIDtype =
            targetDtype === 'q4f16' || targetDtype === 'q4' ? 'q8' : targetDtype;
          lm = await raceLoad('wasm', wasmDtype);
        } else {
          throw err;
        }
      }
      cache.set(lm.cacheKey, lm);
      onProgress?.({ status: 'ready', progress: 100 });
      return lm;
    } finally {
      loadingState.delete(key);
      inFlight.delete(key);
      notify();
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export async function unloadModel(cacheKey: string): Promise<void> {
  const entry = cache.get(cacheKey);
  if (!entry) return;
  try {
    const pl = entry.pipeline as {
      dispose?: () => Promise<void> | void;
      model?: { dispose?: () => Promise<void> | void };
    };
    if (pl?.dispose) await pl.dispose();
    else if (pl?.model?.dispose) await pl.model.dispose();
  } catch (err) {
    console.warn('[ai] Failed to dispose pipeline cleanly', err);
  }
  cache.delete(cacheKey);
  notify();
}

export async function unloadAll(): Promise<void> {
  const keys = Array.from(cache.keys());
  await Promise.all(keys.map(unloadModel));
}

export interface RunParams {
  task: AITask;
  modelId: string;
  /** Per-task input — string, ChatMessage[], Blob, etc. transformers.js validates this at call time. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  options?: RunOptions;
  pretrainedOptions?: Record<string, unknown>;
}

/** Bound the input size we feed to small in-browser models so we don't hang. */
const MAX_TEXT_INPUT_CHARS = 12_000;

export class RunAbortedError extends Error {
  constructor() {
    super('Run aborted');
    this.name = 'RunAbortedError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runModel<T = any>({
  task,
  modelId,
  input,
  options,
  pretrainedOptions,
}: RunParams): Promise<T> {
  if (options?.signal?.aborted) throw new RunAbortedError();

  // Defensive: cap string inputs. Chat-message arrays cap their content fields.
  if (typeof input === 'string' && input.length > MAX_TEXT_INPUT_CHARS) {
    input = input.slice(0, MAX_TEXT_INPUT_CHARS);
  } else if (Array.isArray(input)) {
    input = input.map((m: unknown) => {
      if (
        m &&
        typeof m === 'object' &&
        'content' in m &&
        typeof (m as { content: unknown }).content === 'string' &&
        ((m as { content: string }).content.length) > MAX_TEXT_INPUT_CHARS
      ) {
        const msg = m as { content: string };
        return { ...m, content: msg.content.slice(0, MAX_TEXT_INPUT_CHARS) };
      }
      return m;
    });
  }

  const lm = await loadPipeline({
    task,
    modelId,
    device: options?.device,
    dtype: options?.dtype,
    onProgress: options?.onProgress,
    pretrainedOptions,
    signal: options?.signal,
  });
  if (options?.signal?.aborted) throw new RunAbortedError();
  const pl = lm.pipeline as (input: unknown, opts: Record<string, unknown>) => Promise<T>;
  const callOpts: Record<string, unknown> = { ...(options?.callOptions ?? {}) };
  if (options?.signal) {
    // Race the pipeline call against the abort signal so closing a window
    // breaks out of generation rather than waiting on it.
    const exec = pl(input, callOpts);
    return await Promise.race([
      exec,
      new Promise<T>((_, reject) => {
        options.signal!.addEventListener('abort', () => reject(new RunAbortedError()), {
          once: true,
        });
      }),
    ]);
  }
  return pl(input, callOpts);
}

export function setPreferredDevice(d: AIDevice): void {
  preferredDevice = d;
  notify();
}
