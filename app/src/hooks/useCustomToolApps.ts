import { useEffect, useState } from 'react';
import { loadCustomTools, type CustomTool } from '@/lib/ai/customTools';

/**
 * Subscribes to the custom-tools store and re-fetches when other windows
 * (Tool Studio) save changes. We listen on a window event for cross-component
 * updates so we don't have to plumb state through the WindowManager.
 */
export function useCustomToolApps() {
  const [tools, setTools] = useState<CustomTool[]>([]);

  useEffect(() => {
    let mounted = true;
    const refresh = () => loadCustomTools().then((t) => mounted && setTools(t));
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('webai:custom-tools-updated', refresh as EventListener);
    const interval = window.setInterval(refresh, 5000);
    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('webai:custom-tools-updated', refresh as EventListener);
      window.clearInterval(interval);
    };
  }, []);

  return tools;
}
