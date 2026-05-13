import { useSyncExternalStore } from 'react';
import {
  getRuntimeSnapshot,
  subscribeRuntime,
  type RuntimeSnapshot,
} from '@/lib/ai/runtime';

/**
 * React-friendly view of the AI runtime store. Used by ModelGarden to render
 * which pipelines are currently loaded/loading, and by anything that needs to
 * react to device-fallback transitions.
 */
export function useRuntimeStatus(): RuntimeSnapshot {
  return useSyncExternalStore(subscribeRuntime, getRuntimeSnapshot, getRuntimeSnapshot);
}
