import { useCallback, useEffect, useState } from 'react';
import { getAppById } from '@/os/appRegistry';
import { useWindowManager } from '@/hooks/useWindowManager';
import { useWebGPU } from '@/hooks/useWebGPU';
import { useNotifications } from '@/hooks/useNotifications';
import { useCustomToolApps } from '@/hooks/useCustomToolApps';
import { warmModel } from '@/apps/AppLayout';
import { ESSENTIAL_MODELS } from '@/lib/ai/modelGarden';
import type { Notification } from '@/types/os';
import Desktop from '@/os/Desktop';
import Taskbar from '@/os/Taskbar';
import StartMenu from '@/os/StartMenu';
import AppWindow from '@/os/AppWindow';
import Notifications from '@/os/Notifications';
import AppErrorBoundary from '@/os/ErrorBoundary';

/**
 * Validates a custom tool ID extracted from a `custom:<id>` launch route.
 * Only alphanumeric, hyphen, underscore, and dot are allowed — no slashes,
 * colons, spaces, or empty strings. This prevents malformed IDs from leaking
 * into window state or creating unexpected routing behavior.
 *
 * Exported for testing; not part of the component's public surface.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function isValidCustomToolId(id: string): boolean {
  return id.length > 0 && /^[\w\-.]+$/.test(id);
}

export default function App() {
  const {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
  } = useWindowManager();
  const { status: webGPUStatus } = useWebGPU();
  const { notifications, notify, dismiss } = useNotifications();
  const customTools = useCustomToolApps();
  const [startOpen, setStartOpen] = useState(false);

  // Pre-warm a couple of small essential models (embeddings + summarization)
  // in the background so the first tool launch feels instant. These calls
  // are idempotent: subsequent launches hit the cache.
  useEffect(() => {
    let cancelled = false;
    // Opt-in only: only pre-warm models when the user has explicitly enabled it.
    // Default is OFF so the first page load never triggers surprise downloads.
    const enabled = localStorage.getItem('webai:autoload-models') === 'on';
    if (!enabled) return;
    (async () => {
      for (const m of ESSENTIAL_MODELS) {
        if (cancelled) return;
        try {
          await warmModel(m.id);
        } catch {
          /* surfaced in Model Garden */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || (e.ctrlKey && e.key === 'Escape')) {
        e.preventDefault();
        setStartOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setStartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLaunchApp = useCallback(
    (appId: string, data?: Record<string, unknown>) => {
      // Custom tool launches: open the runner window with the tool id.
      if (appId.startsWith('custom:')) {
        const toolId = appId.slice('custom:'.length);
        if (!isValidCustomToolId(toolId)) {
          console.warn(`[App] Rejected malformed custom tool ID: "${toolId}"`);
          return;
        }
        const tool = customTools.find((t) => t.id === toolId);
        openWindow('customtool', { toolId });
        if (tool) notify(tool.name, 'is now running', 'info');
        return;
      }
      const app = getAppById(appId);
      if (!app) return;
      if (app.requiresWebGPU && !webGPUStatus.supported) {
        notify('WebGPU Not Available', 'Using CPU fallback.', 'warning');
      }
      openWindow(appId, data);
      notify(`${app.name}`, 'is now running', 'info');
    },
    [openWindow, webGPUStatus.supported, notify, customTools]
  );

  return (
    <div
      className="h-screen w-screen overflow-hidden relative select-none"
      style={{
        background:
          'radial-gradient(ellipse at 20% 30%, rgba(124,107,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(56,189,248,0.10) 0%, transparent 50%), linear-gradient(180deg, #050508 0%, #0a0a12 100%)',
      }}
    >
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              background: i % 3 === 0 ? '#7c6bff' : i % 3 === 1 ? '#38bdf8' : '#4ade80',
              left: `${(i * 5.2) % 100}%`,
              top: `${(i * 7.3) % 100}%`,
              animation: `float ${10 + (i % 20)}s linear infinite`,
              animationDelay: `${(i * 0.5) % 10}s`,
            }}
          />
        ))}
      </div>

      {/* Desktop Icons */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <Desktop onLaunchApp={handleLaunchApp} />
      </div>

      {/* Window Layer
         pointer-events: none on the wrapper so clicks on empty space fall
         through to the Desktop underneath. Each AppWindow re-enables pointer
         events for its own bounds. */}
      <div
        className="absolute inset-0 pb-12"
        style={{ zIndex: 20, pointerEvents: 'none' }}
      >
        <div className="relative w-full h-full">
          {windows.map((w) => {
            const app = getAppById(w.appId);
            if (!app || w.isMinimized) return null;
            const AppComponent = app.component;
            return (
              <div key={w.id} style={{ pointerEvents: 'auto' }}>
                <AppWindow
                  window={w}
                  onFocus={() => focusWindow(w.id)}
                  onClose={() => closeWindow(w.id)}
                  onMinimize={() => minimizeWindow(w.id)}
                  onMaximize={() => maximizeWindow(w.id)}
                >
                  <AppErrorBoundary label={app.name}>
                    <AppComponent
                      windowId={w.id}
                      data={w.data}
                      onNotify={(title: string, message: string, type: Notification['type']) =>
                        notify(title, message, type)
                      }
                      webGPUStatus={webGPUStatus}
                    />
                  </AppErrorBoundary>
                </AppWindow>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Menu — only mount when open so it never blocks clicks. */}
      {startOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <StartMenu
            isOpen={startOpen}
            onClose={() => setStartOpen(false)}
            onLaunchApp={handleLaunchApp}
            customTools={customTools}
            user={null}
            onLogout={undefined}
          />
        </div>
      )}

      {/* Taskbar */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <Taskbar
            windows={windows}
            onStartClick={() => setStartOpen(!startOpen)}
            onWindowClick={handleLaunchApp}
            onWindowRestore={restoreWindow}
            webGPUStatus={webGPUStatus}
            startOpen={startOpen}
            notifications={notifications}
          />
        </div>
      </div>

      {/* Notifications — toast stack opts in to pointer events on each toast. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <Notifications notifications={notifications} onDismiss={dismiss} />
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
          100% { transform: translateY(0) translateX(0); }
        }
      `}</style>
    </div>
  );
}
