import { useState, useCallback, useRef } from 'react';
import type { WindowState } from '@/types/os';
import { getAppById } from '@/os/appRegistry';

let nextZIndex = 100;
let windowIdCounter = 0;

function generateWindowId(): string {
  return `win-${++windowIdCounter}-${Date.now()}`;
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const windowsRef = useRef(windows);
  windowsRef.current = windows;

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 100);
      return prev.map((w) =>
        w.id === id
          ? { ...w, isFocused: true, zIndex: maxZ + 1, isMinimized: false }
          : { ...w, isFocused: false },
      );
    });
  }, []);

  const openWindow = useCallback(
    (appId: string, data?: Record<string, unknown>) => {
      const app = getAppById(appId);
      if (!app) return;

      const existing = windowsRef.current.find(
        (w) => w.appId === appId && !w.isMinimized,
      );
      if (existing) {
        focusWindow(existing.id);
        return;
      }

      const id = generateWindowId();
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

      const offset = windowsRef.current.length * 24;
      const x = Math.max(24, Math.min(screenW - app.defaultWidth - 24, 120 + offset));
      const y = Math.max(24, Math.min(screenH - app.defaultHeight - 72, 60 + offset));

      const newWindow: WindowState = {
        id,
        appId,
        title: app.name,
        x,
        y,
        width: app.defaultWidth,
        height: app.defaultHeight,
        isMinimized: false,
        isMaximized: false,
        isFocused: true,
        zIndex: ++nextZIndex,
        data,
      };

      setWindows((prev) =>
        prev.map((w) => ({ ...w, isFocused: false })).concat(newWindow),
      );

      return id;
    },
    [focusWindow],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.isMaximized) {
          return { ...w, isMaximized: false };
        }
        return { ...w, isMaximized: true };
      })
    );
  }, []);

  const updateWindow = useCallback(
    (id: string, updates: Partial<WindowState>) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
    },
    []
  );

  const restoreWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isMinimized: false, isFocused: true } : w
      )
    );
  }, []);

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    updateWindow,
    restoreWindow,
  };
}
