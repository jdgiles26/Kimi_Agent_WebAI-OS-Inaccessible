import { useEffect, useState } from 'react';
import type { WebGPUStatus } from '@/types/os';

interface NavigatorWithGPU {
  gpu?: {
    requestAdapter: () => Promise<{
      requestAdapterInfo: () => Promise<{ description?: string; vendor?: string }>;
    } | null>;
  };
}

/**
 * Probe WebGPU capability on mount and expose a status snapshot.
 *
 * The richer "loading / inferencing" sub-states live in the AI runtime store
 * (`useRuntimeStatus`). This hook is intentionally narrow — it only answers
 * "does this browser have a usable WebGPU adapter?".
 */
export function useWebGPU() {
  const [status, setStatus] = useState<WebGPUStatus>({
    supported: false,
    state: 'idle',
    message: 'Checking WebGPU...',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nav: NavigatorWithGPU | undefined =
        typeof navigator !== 'undefined' ? (navigator as unknown as NavigatorWithGPU) : undefined;
      if (!nav?.gpu) {
        if (!cancelled) {
          setStatus({
            supported: false,
            state: 'unsupported',
            message: 'WebGPU not available — using CPU fallback',
          });
        }
        return;
      }
      try {
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) {
          if (!cancelled) {
            setStatus({
              supported: false,
              state: 'unsupported',
              message: 'No WebGPU adapter found — using CPU fallback',
            });
          }
          return;
        }
        const info = await adapter.requestAdapterInfo();
        if (!cancelled) {
          setStatus({
            supported: true,
            state: 'idle',
            message: `WebGPU ready — ${info.description || info.vendor || 'GPU'}`,
            adapterInfo: info.description || info.vendor,
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({
            supported: false,
            state: 'unsupported',
            message: 'WebGPU error — using CPU fallback',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { status };
}
